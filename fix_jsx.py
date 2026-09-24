import re

with open('src/pages/Interview.tsx', 'r') as f:
    content = f.read()

# First remove the bad )}` that was added
content = content.replace('          )}\n          {/* Prompt transition button in case question flow completes */}', '          {/* Prompt transition button in case question flow completes */}')


# Replace Transcript header correctly
target_str = """          {/* Transcript Dialogue container */}
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300 font-mono">Discussion Feed</span>
            <h4 className="text-xs font-bold text-zinc-200">Conversation Transcript</h4>
          </div>
          <div className="flex-1 p-4 overflow-y-auto min-h-[220px] max-h-[360px] flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">"""

new_str = """          {/* Transcript Dialogue container */}
          <div 
            className="p-3.5 border-b border-zinc-800 bg-zinc-950/40 cursor-pointer flex justify-between items-center"
            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          >
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300 font-mono">Discussion Feed</span>
              <h4 className="text-xs font-bold text-zinc-200">Conversation Transcript</h4>
            </div>
            <div className="text-zinc-400">
              {isTranscriptOpen ? '▼' : '▶'}
            </div>
          </div>
          {isTranscriptOpen && (
          <div className="flex-1 p-4 overflow-y-auto min-h-[220px] max-h-[360px] flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">"""

content = content.replace(target_str, new_str)

# Now we need to close the `isTranscriptOpen && (` block.
# Let's find the closing `</div>` of the transcript area.
target_str2 = """             <div ref={messagesEndRef} />
          </div>
          {/* Prompt transition button in case question flow completes */}"""

new_str2 = """             <div ref={messagesEndRef} />
          </div>
          )}
          {/* Prompt transition button in case question flow completes */}"""

content = content.replace(target_str2, new_str2)

with open('src/pages/Interview.tsx', 'w') as f:
    f.write(content)
print("Fix applied")
