import type { Delta } from 'openai/resources';

declare module 'openai/resources' {
    interface Delta {
        reasoning_content?: string;
        content?: string;
        role?: string;
    }
}
