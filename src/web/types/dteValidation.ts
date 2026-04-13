export interface DteValidationIssue {
  code: string
  field: string
  message: string
}

export interface DteValidationResult {
  isValid: boolean
  issues: DteValidationIssue[]
}
