namespace AdmissionSystem.Api.Exceptions;

public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message) { }
}

public class SeatUnavailableException : DomainException
{
    public SeatUnavailableException(string message = "No available seats remaining in this class.") 
        : base(message) { }
}

public class ActiveApplicationExistsException : DomainException
{
    public ActiveApplicationExistsException(string message = "Student already has an active hold or confirmed admission in this class.") 
        : base(message) { }
}

public class HoldExpiredException : DomainException
{
    public HoldExpiredException(string message = "The seat hold has expired and can no longer be confirmed.") 
        : base(message) { }
}

public class ResourceNotFoundException : DomainException
{
    public ResourceNotFoundException(string message) : base(message) { }
}

public class UnauthorizedHoldAccessException : DomainException
{
    public UnauthorizedHoldAccessException(string message = "You are not authorized to access or modify this hold.") 
        : base(message) { }
}

public class InvalidHoldOperationException : DomainException
{
    public InvalidHoldOperationException(string message) : base(message) { }
}

