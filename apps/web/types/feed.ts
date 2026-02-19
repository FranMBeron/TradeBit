export interface PostAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  content: string;
  tradeTicker: string | null;
  tradeAction: "BUY" | "SELL" | null;
  tradeAmount: string | null;
  tradePrice: string | null;
  tradeChangePct: string | null;
  createdAt: string;
  authorId: string;
  author: PostAuthor;
  reactions: {
    rocket: number;
    chart: number;
    speech: number;
    diamond: number;
  };
  userReactions: string[];
}

export type ReactionType = "rocket" | "chart" | "speech" | "diamond";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}
