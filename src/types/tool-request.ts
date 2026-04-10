/** Tool listing request submitted by users (stored in `tool_requests` table). */
export interface ToolRequest {
  id: number;
  tool_name: string;
  description: string;
  submitted_by: string | null;
  link: string | null;
  status: string;
  created_at: string;
}
