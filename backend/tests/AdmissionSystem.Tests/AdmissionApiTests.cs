using System.Net;
using System.Net.Http.Json;
using System.Text;
using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Models;
using AdmissionSystem.Tests.Infrastructure;

namespace AdmissionSystem.Tests;

public class AdmissionApiTests : IClassFixture<PostgresDatabaseFixture>
{
    private readonly PostgresDatabaseFixture _fixture;
    private static int _studentCounter = 10000;

    public AdmissionApiTests(PostgresDatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    private static string NextStudentId() =>
        $"201526912345{Interlocked.Increment(ref _studentCounter):D5}";

    private AdmissionApiFactory CreateFactory(int holdDurationSeconds = 600, int expiryPollSeconds = 5) =>
        new(_fixture.ConnectionString, holdDurationSeconds, expiryPollSeconds);

    [Fact]
    public async Task CreateHoldAndConfirm_FullLifecycle_UpdatesSeatCountsAccurately()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var studentId = NextStudentId();

        // 1. Admin creates a class
        var createClassResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 6 - Morning Shift", 10));
        Assert.Equal(HttpStatusCode.Created, createClassResp.StatusCode);

        var createdClass = await createClassResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);
        Assert.Equal("Class 6 - Morning Shift", createdClass.Name);
        Assert.Equal(10, createdClass.TotalSeats);

        // 2. Student holds a seat
        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", studentId);
        var holdResp = await client.SendAsync(holdReq);
        Assert.Equal(HttpStatusCode.Created, holdResp.StatusCode);

        var hold = await holdResp.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(hold);
        Assert.Equal(HoldStatus.Held, hold.Status);
        Assert.Equal(studentId, hold.StudentId);

        // 3. Check class seat breakdown while held
        var detailAfterHold = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(detailAfterHold);
        Assert.Equal(1, detailAfterHold.HeldSeats);
        Assert.Equal(0, detailAfterHold.ConfirmedSeats);
        Assert.Equal(9, detailAfterHold.AvailableSeats);

        // 4. Student confirms admission
        using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        confirmReq.Headers.Add("X-Student-Id", studentId);
        var confirmResp = await client.SendAsync(confirmReq);
        Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);

        var confirmed = await confirmResp.Content.ReadFromJsonAsync<ConfirmHoldResponse>();
        Assert.NotNull(confirmed);
        Assert.Equal(HoldStatus.Confirmed, confirmed.Status);

        // 5. Check class seat breakdown after confirm
        var detailAfterConfirm = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(detailAfterConfirm);
        Assert.Equal(0, detailAfterConfirm.HeldSeats);
        Assert.Equal(1, detailAfterConfirm.ConfirmedSeats);
        Assert.Equal(9, detailAfterConfirm.AvailableSeats);

        // 6. Check /me/holds lists confirmed admission
        using var meReq = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        meReq.Headers.Add("X-Student-Id", studentId);
        var meResp = await client.SendAsync(meReq);
        Assert.Equal(HttpStatusCode.OK, meResp.StatusCode);

        var myHolds = await meResp.Content.ReadFromJsonAsync<List<StudentHoldResponse>>();
        Assert.NotNull(myHolds);
        var myApplication = Assert.Single(myHolds);
        Assert.Equal(hold.HoldId, myApplication.HoldId);
        Assert.Equal("Class 6 - Morning Shift", myApplication.ClassName);
        Assert.Equal(HoldStatus.Confirmed, myApplication.Status);
    }

    [Fact]
    public async Task Concurrency_FiftySimultaneousRequestsForFiveSeats_NeverExceedsTotalSeats()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        const int totalSeats = 5;
        const int concurrentApplicants = 50;

        var createResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 7 - Concurrency Test", totalSeats));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdClass = await createResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        var studentIds = Enumerable.Range(0, concurrentApplicants).Select(_ => NextStudentId()).ToList();
        var startGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var tasks = studentIds.Select(async sid =>
        {
            await startGate.Task;
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
            req.Headers.Add("X-Student-Id", sid);
            return await client.SendAsync(req);
        }).ToList();

        // Release all 50 requests simultaneously
        startGate.SetResult();
        var responses = await Task.WhenAll(tasks);

        var createdCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);
        var serverErrorCount = responses.Count(r => (int)r.StatusCode >= 500);

        Assert.Equal(totalSeats, createdCount);
        Assert.Equal(concurrentApplicants - totalSeats, conflictCount);
        Assert.Equal(0, serverErrorCount);

        var classDetail = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(classDetail);
        Assert.Equal(totalSeats, classDetail.HeldSeats);
        Assert.Equal(0, classDetail.ConfirmedSeats);
        Assert.Equal(0, classDetail.AvailableSeats);
        Assert.True(classDetail.HeldSeats + classDetail.ConfirmedSeats <= classDetail.TotalSeats);
    }

    [Fact]
    public async Task HoldExpiration_AfterHoldDurationElapsed_AutomaticallyReleasesSeat()
    {
        // Configure fast 2-second hold duration and 1-second background worker interval
        await using var factory = CreateFactory(holdDurationSeconds: 2, expiryPollSeconds: 1);
        using var client = factory.CreateClient();

        var studentA = NextStudentId();
        var studentB = NextStudentId();

        var createResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 8 - Expiry Test", 1));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdClass = await createResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        // Student A acquires the sole seat
        using var reqA = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        reqA.Headers.Add("X-Student-Id", studentA);
        var respA = await client.SendAsync(reqA);
        Assert.Equal(HttpStatusCode.Created, respA.StatusCode);
        var holdA = await respA.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(holdA);

        // Student B is blocked while hold is active
        using var reqB1 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        reqB1.Headers.Add("X-Student-Id", studentB);
        var respB1 = await client.SendAsync(reqB1);
        Assert.Equal(HttpStatusCode.Conflict, respB1.StatusCode);

        // Wait past hold duration + background worker sweep without calling any expiry endpoint
        await Task.Delay(TimeSpan.FromSeconds(3.5));

        var holdDetail = await client.GetFromJsonAsync<HoldDetailResponse>($"/holds/{holdA.HoldId}");
        Assert.NotNull(holdDetail);
        Assert.Equal(HoldStatus.Expired, holdDetail.Status);

        var classDetail = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(classDetail);
        Assert.Equal(0, classDetail.HeldSeats);
        Assert.Equal(1, classDetail.AvailableSeats);

        // Student A cannot confirm after expiry
        using var confirmExpiredReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdA.HoldId}/confirm");
        confirmExpiredReq.Headers.Add("X-Student-Id", studentA);
        var confirmExpiredResp = await client.SendAsync(confirmExpiredReq);
        Assert.Equal(HttpStatusCode.BadRequest, confirmExpiredResp.StatusCode);

        // Student B can now acquire the automatically released seat
        using var reqB2 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        reqB2.Headers.Add("X-Student-Id", studentB);
        var respB2 = await client.SendAsync(reqB2);
        Assert.Equal(HttpStatusCode.Created, respB2.StatusCode);
    }

    [Fact]
    public async Task ConfirmHold_IsIdempotent_AndEnforcesOwnership()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var ownerId = NextStudentId();
        var otherStudentId = NextStudentId();

        var createResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 9 - Idempotency Test", 5));
        var createdClass = await createResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        using var holdReq = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReq.Headers.Add("X-Student-Id", ownerId);
        var hold = await (await client.SendAsync(holdReq)).Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(hold);

        // Another student cannot confirm someone else's hold
        using var unauthorizedReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
        unauthorizedReq.Headers.Add("X-Student-Id", otherStudentId);
        var unauthorizedResp = await client.SendAsync(unauthorizedReq);
        Assert.Equal(HttpStatusCode.Forbidden, unauthorizedResp.StatusCode);

        // Owner confirms 3 times -> all succeed and confirmedSeats increments only once
        for (var i = 0; i < 3; i++)
        {
            using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/holds/{hold.HoldId}/confirm");
            confirmReq.Headers.Add("X-Student-Id", ownerId);
            var confirmResp = await client.SendAsync(confirmReq);
            Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);
            var body = await confirmResp.Content.ReadFromJsonAsync<ConfirmHoldResponse>();
            Assert.NotNull(body);
            Assert.Equal(HoldStatus.Confirmed, body.Status);
        }

        var classDetail = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(classDetail);
        Assert.Equal(1, classDetail.ConfirmedSeats);
        Assert.Equal(0, classDetail.HeldSeats);
        Assert.Equal(4, classDetail.AvailableSeats);
    }

    [Fact]
    public async Task SingleActiveApplicationRule_And_CancelHold_ReleasesSeat()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var studentId = NextStudentId();

        var createResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 10 - Single Hold & Cancel", 2));
        var createdClass = await createResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        // First hold succeeds
        using var holdReq1 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReq1.Headers.Add("X-Student-Id", studentId);
        var holdResp1 = await client.SendAsync(holdReq1);
        Assert.Equal(HttpStatusCode.Created, holdResp1.StatusCode);
        var hold = await holdResp1.Content.ReadFromJsonAsync<CreateHoldResponse>();
        Assert.NotNull(hold);

        // Second hold by same student in same class fails
        using var holdReq2 = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
        holdReq2.Headers.Add("X-Student-Id", studentId);
        var holdResp2 = await client.SendAsync(holdReq2);
        Assert.Equal(HttpStatusCode.BadRequest, holdResp2.StatusCode);

        // Cancel the hold
        using var deleteReq = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{hold.HoldId}");
        deleteReq.Headers.Add("X-Student-Id", studentId);
        var deleteResp = await client.SendAsync(deleteReq);
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        var holdDetail = await client.GetFromJsonAsync<HoldDetailResponse>($"/holds/{hold.HoldId}");
        Assert.NotNull(holdDetail);
        Assert.Equal(HoldStatus.Cancelled, holdDetail.Status);

        var classDetail = await client.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        Assert.NotNull(classDetail);
        Assert.Equal(0, classDetail.HeldSeats);
        Assert.Equal(2, classDetail.AvailableSeats);
    }

    [Fact]
    public async Task InvalidInputs_AlwaysReturn4xx_Never500()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var validClassResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class 11 - Validation", 5));
        var validClass = await validClassResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(validClass);

        // 1. Invalid class creations
        var emptyNameResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("   ", 10));
        Assert.Equal(HttpStatusCode.BadRequest, emptyNameResp.StatusCode);

        var zeroSeatsResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class Zero", 0));
        Assert.Equal(HttpStatusCode.BadRequest, zeroSeatsResp.StatusCode);

        var negativeSeatsResp = await client.PostAsJsonAsync("/classes", new CreateClassRequest("Class Neg", -5));
        Assert.Equal(HttpStatusCode.BadRequest, negativeSeatsResp.StatusCode);

        // 2. Malformed JSON payload
        using var malformedContent = new StringContent("{ \"name\": \"Broken\", \"totalSeats\": \"abc\" }", Encoding.UTF8, "application/json");
        var malformedResp = await client.PostAsync("/classes", malformedContent);
        Assert.Equal(HttpStatusCode.BadRequest, malformedResp.StatusCode);

        // 3. Missing / invalid X-Student-Id
        var missingHeaderResp = await client.PostAsync($"/classes/{validClass.Id}/holds", null);
        Assert.Equal(HttpStatusCode.BadRequest, missingHeaderResp.StatusCode);

        using var badStudentReq = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        badStudentReq.Headers.Add("X-Student-Id", "not-17-digits");
        var badStudentResp = await client.SendAsync(badStudentReq);
        Assert.Equal(HttpStatusCode.BadRequest, badStudentResp.StatusCode);

        // 4. Non-existent resources
        var unknownClassResp = await client.GetAsync("/classes/c_nonexistent");
        Assert.Equal(HttpStatusCode.NotFound, unknownClassResp.StatusCode);

        var unknownHoldResp = await client.GetAsync("/holds/h_nonexistent");
        Assert.Equal(HttpStatusCode.NotFound, unknownHoldResp.StatusCode);
    }

    [Fact]
    public async Task Concurrency_TwoIndependentBackendInstances_SharingSameDatabase_NeverExceedsTotalSeats()
    {
        // Two completely separate ASP.NET Core hosts with independent DI containers and DbContext pools
        await using var instanceA = CreateFactory();
        await using var instanceB = CreateFactory();
        using var clientA = instanceA.CreateClient();
        using var clientB = instanceB.CreateClient();

        const int totalSeats = 5;
        const int requestsPerInstance = 25;

        var createResp = await clientA.PostAsJsonAsync(
            "/classes",
            new CreateClassRequest("Class 12 - Multi-Process Bonus Test", totalSeats));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var createdClass = await createResp.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(createdClass);

        var startGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var tasksA = Enumerable.Range(0, requestsPerInstance).Select(async _ =>
        {
            var sid = NextStudentId();
            await startGate.Task;
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
            req.Headers.Add("X-Student-Id", sid);
            return await clientA.SendAsync(req);
        });

        var tasksB = Enumerable.Range(0, requestsPerInstance).Select(async _ =>
        {
            var sid = NextStudentId();
            await startGate.Task;
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/classes/{createdClass.Id}/holds");
            req.Headers.Add("X-Student-Id", sid);
            return await clientB.SendAsync(req);
        });

        var allTasks = tasksA.Concat(tasksB).ToList();

        // Release all 50 requests across both independent backend instances simultaneously
        startGate.SetResult();
        var responses = await Task.WhenAll(allTasks);

        var createdCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);
        var serverErrorCount = responses.Count(r => (int)r.StatusCode >= 500);

        Assert.Equal(totalSeats, createdCount);
        Assert.Equal((requestsPerInstance * 2) - totalSeats, conflictCount);
        Assert.Equal(0, serverErrorCount);

        var detailFromA = await clientA.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");
        var detailFromB = await clientB.GetFromJsonAsync<ClassDetailResponse>($"/classes/{createdClass.Id}");

        Assert.NotNull(detailFromA);
        Assert.NotNull(detailFromB);
        Assert.Equal(totalSeats, detailFromA.HeldSeats);
        Assert.Equal(0, detailFromA.AvailableSeats);
        Assert.Equal(detailFromA.HeldSeats, detailFromB.HeldSeats);
        Assert.True(detailFromB.HeldSeats + detailFromB.ConfirmedSeats <= detailFromB.TotalSeats);
    }
}

