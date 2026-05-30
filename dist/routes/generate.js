import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { claude, MODEL } from '../lib/claude.js';
export const generateRoutes = new Hono();
const writeFileTool = {
    name: 'write_file',
    description: 'Write a file with the given path and content. Call this once per file.',
    input_schema: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'The file path, e.g. src/index.ts',
            },
            content: {
                type: 'string',
                description: 'The full content of the file',
            },
        },
        required: ['path', 'content'],
    },
};
generateRoutes.get('/app', async (c) => {
    const prompt = c.req.query('prompt');
    if (!prompt) {
        return c.json({ error: 'prompt is required' }, 400);
    }
    return streamSSE(c, async (stream) => {
        const files = [];
        const messages = [
            { role: 'user', content: prompt },
        ];
        let iteration = 0;
        while (true) {
            iteration++;
            await stream.writeSSE({ event: 'status', data: `iteration ${iteration}` });
            const apiStream = claude.messages.stream({
                model: MODEL,
                max_tokens: 16000,
                // display: 'summarized' is required — Opus 4.8 omits thinking text by default
                thinking: { type: 'adaptive', display: 'summarized' },
                system: [
                    {
                        type: 'text',
                        text: 'You are an expert software engineer. When asked to build an application, use the write_file tool to create each file. Write complete, working code for every file.',
                        cache_control: { type: 'ephemeral' },
                    },
                ],
                tools: [writeFileTool],
                messages,
            });
            // Stream every delta as it arrives
            for await (const event of apiStream) {
                if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'thinking_delta') {
                        await stream.writeSSE({ event: 'thinking', data: event.delta.thinking });
                    }
                    else if (event.delta.type === 'text_delta') {
                        await stream.writeSSE({ event: 'text', data: event.delta.text });
                    }
                    else if (event.delta.type === 'input_json_delta') {
                        // Tool input being assembled — skip, we handle it on finalMessage
                    }
                }
                else if (event.type === 'content_block_start') {
                    if (event.content_block.type === 'tool_use') {
                        await stream.writeSSE({ event: 'tool_start', data: event.content_block.name });
                    }
                }
            }
            const message = await apiStream.finalMessage();
            // Collect written files and emit an event for each
            for (const block of message.content) {
                if (block.type === 'tool_use' && block.name === 'write_file') {
                    const input = block.input;
                    files.push(input);
                    await stream.writeSSE({ event: 'file', data: JSON.stringify({ path: input.path }) });
                }
            }
            if (message.stop_reason === 'end_turn')
                break;
            if (message.stop_reason === 'tool_use') {
                const toolResults = message.content
                    .filter((b) => b.type === 'tool_use')
                    .map((b) => ({
                    type: 'tool_result',
                    tool_use_id: b.id,
                    content: 'File written successfully.',
                }));
                messages.push({ role: 'assistant', content: message.content });
                messages.push({ role: 'user', content: toolResults });
            }
            else {
                break;
            }
        }
        // Final event contains all generated files
        await stream.writeSSE({ event: 'done', data: JSON.stringify(files) });
    });
});
