export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Suggestion {
  label: string;
  query: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  description: string;
  icon: string;
}