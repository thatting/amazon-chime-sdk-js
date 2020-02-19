export default interface LogBody {
    sequenceNumber: number,
    message: string,
    timestampMs: number,
    logLevel: string
}