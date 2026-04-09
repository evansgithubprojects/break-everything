export interface Tool {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: string;
  icon: string;
  download_url: string;
  github_url: string;
  platform: string;
  sha256_hash: string | null;
  safety_score: number;
  last_scan_date: string | null;
  downloads: number;
  created_at: string;
  updated_at: string;
}
