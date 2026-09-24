import re

with open('src/pages/Interview.tsx', 'r') as f:
    content = f.read()

# Fix right panel width
old_width = 'w-[360px] md:w-[420px]'
new_width = 'w-[320px] md:w-[360px]'
content = content.replace(old_width, new_width)

old_header = """          {/* Transcript Dialogue container */}
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/40">
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-300 font-mono">Discussion Feed</span>
            <h4 className="text-xs font-bold text-zinc-200">Conversation Transcript</h4>
          </div>
          <div className="flex-1 p-4 overflow-y-auto min-h-[220px] max-h-[360px] flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">"""

new_header = """          {/* Transcript Dialogue container */}
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

content = content.replace(old_header, new_header)

input_box_start = '{/* Prompt transition button in case question flow completes */}'

if input_box_start in content:
    content = content.replace(input_box_start, '          )}\n          ' + input_box_start)
    with open('src/pages/Interview.tsx', 'w') as f:
        f.write(content)
    print("Patched right panel")
else:
    print("Could not find input box start")
