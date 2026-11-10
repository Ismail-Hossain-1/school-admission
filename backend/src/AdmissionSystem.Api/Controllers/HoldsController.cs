using AdmissionSystem.Api.DTOs;
using AdmissionSystem.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AdmissionSystem.Api.Controllers;

[ApiController]
[Route("holds")]
public class HoldsController : ControllerBase
{
    private readonly IAdmissionService _admissionService;

    public HoldsController(IAdmissionService admissionService)
    {
        _admissionService = admissionService;
    }

    [HttpGet("{holdId}")]
    [ProducesResponseType(typeof(HoldDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHoldById(
        [FromRoute] string holdId,
        CancellationToken ct)
    {
        var hold = await _admissionService.GetHoldByIdAsync(holdId, ct);
        return Ok(hold);
    }

    [HttpPost("{holdId}/confirm")]
    [ProducesResponseType(typeof(ConfirmHoldResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ConfirmHold(
        [FromRoute] string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        var normalizedStudentId = studentId?.Trim() ?? string.Empty;
        var result = await _admissionService.ConfirmHoldAsync(holdId, normalizedStudentId, ct);
        return Ok(result);
    }

    [HttpDelete("{holdId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelHold(
        [FromRoute] string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId,
        CancellationToken ct)
    {
        var normalizedStudentId = studentId?.Trim() ?? string.Empty;
        await _admissionService.CancelHoldAsync(holdId, normalizedStudentId, ct);
        return NoContent();
    }
}
