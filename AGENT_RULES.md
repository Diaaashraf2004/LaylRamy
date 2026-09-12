# Antigravity Agent Strict Rules

**CRITICAL: NEVER USE STRING REPLACEMENT OR SPLIT FOR CODE MODIFICATION**

When editing code files (especially large files like `finance-core.js`), you MUST strictly adhere to the following rules to prevent catastrophic data loss and code truncation:

1. **NEVER use `.split(target)[0]` or similar array truncations to replace functions.** This approach is highly destructive and will silently delete hundreds of kilobytes of code if the target string appears more than once or at the top of the file.
2. **DO NOT use basic `code.replace()` with small/generic strings.** Always use clear, unique, and bounded regular expressions (e.g., matching precisely the start and end of a function).
3. **Always use the IDE's built-in `replace_file_content` tool** when possible, as it provides safety mechanisms and line-level targeting.
4. **Before writing to a file, verify the byte size.** If your modified string is significantly smaller than the original file string, you have truncated the file. STOP and abort the write.
5. **Always double-check syntax** using `node -c "path/to/file.js"` before ending your turn.
