export enum TransactionType {
  FUND    = 'FUND',     // wallet top-up from external payment
  CONVERT = 'CONVERT',  // internal currency swap within same account
  TRADE   = 'TRADE',    // FX market execution — buy/sell at live rate
}