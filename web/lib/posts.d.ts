export type Post = {
    slug: string;
    title: string;
    contentHtml: string;
};
export declare function getAllPosts(): Post[];
export declare function getPostBySlug(slug: string): Post | null;
//# sourceMappingURL=posts.d.ts.map