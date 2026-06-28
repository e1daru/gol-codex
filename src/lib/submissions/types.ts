export type SubmissionStatus = "pending" | "approved" | "rejected";

export type SubmissionRecord = {
  id: string;
  name: string;
  status: SubmissionStatus;
  client_token_hash: string;
  ip_hash: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  approved_by: string | null;
};

export type PublicSubmission = Pick<SubmissionRecord, "id" | "name" | "status" | "created_at" | "approved_at">;

export type AdminSubmission = Pick<
  SubmissionRecord,
  "id" | "name" | "status" | "created_at" | "approved_at" | "rejected_at" | "approved_by"
>;

export type DisplaySubmission = Pick<SubmissionRecord, "id" | "name" | "approved_at">;
