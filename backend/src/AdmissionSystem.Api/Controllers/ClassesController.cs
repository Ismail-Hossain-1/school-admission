using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AdmissionSystem.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public ClassesController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ClassResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateClass(
        [FromBody] CreateClassRequest request,
        CancellationToken ct)
    {
        var created = await _admissionService.CreateClassAsync(request, ct);
        return Created($"/classes/{created.Id}", created);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ClassDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllClasses(CancellationToken ct)
    {
        var classes = await _admissionService.GetAllClassesAsync(ct);
        return Ok(classes);
    }

    [HttpGet("{classId}")]
    [ProducesResponseType(typeof(ClassDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClassById(
        [FromRoute] string classId,
        CancellationToken ct)
    {
        var classDetail = await _admissionService.GetClassByIdAsync(classId, ct);
        return Ok(classDetail);
    }

    [HttpPost("{classId}/holds")]
    [ProducesResponseType(typeof(CreateHoldResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateHold(
        [FromRoute] string classId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        var normalizedStudentId = studentId?.Trim() ?? string.Empty;
        var hold = await _admissionService.CreateHoldAsync(classId, normalizedStudentId, ct);
        return Created($"/holds/{hold.HoldId}", hold);
    }
}

