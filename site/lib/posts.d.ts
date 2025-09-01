export type PostMeta = {
    title: string;
    date?: string;
    description?: string;
    slug: string[];
};
export declare function getAllPosts(): Promise<PostMeta[]>;
export declare function getPost(slug: string[]): Promise<{
    meta: PostMeta;
    html: string;
} | null>;
//# sourceMappingURL=posts.d.ts.map