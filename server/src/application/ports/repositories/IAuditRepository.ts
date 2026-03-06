export interface AuditLog {
  id?: string;
  action: string;
  actor_uid: string;
  target_uid: string;
  reason: string | null;
  before: any;
  after: any;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface IAuditRepository {
  save(log: AuditLog): Promise<void>;
  findByUser(
    uid: string,
    limit: number,
    cursor?: string,
  ): Promise<{ logs: AuditLog[]; nextCursor?: string }>;
}
