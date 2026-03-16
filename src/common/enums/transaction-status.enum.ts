export enum TransactionStatus {
  PENDING   = 'PENDING',    // created but not yet settled
  COMPLETED = 'COMPLETED',  // fully settled, balances updated
  FAILED    = 'FAILED',     // attempted but did not complete — see failureReason
  REVERSED  = 'REVERSED',   // completed then reversed — balances restored
}