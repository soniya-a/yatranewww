import re

with open('src/pages/Interview.tsx', 'r') as f:
    content = f.read()

# Fix right panel width
old_width = 'w-[360px] md:w-[420px]'
new_width = 'w-[320px] md:w-[360px]'
content = content.replace(old_width, new_width)

# Add collapse toggle to transcript
transcript_header_start = '{/* Transcript Dialogue container */}'
transcript_header_end = '<div className="flex-1 p-4 overflow-y-auto min-h-[220px] max-h-[360px] flex flex-col gap-3 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">'

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

# Now find the end of this div to add `)}`
# Search for: <div className="p-3 bg-zinc-900 border-t border-zinc-800 relative">
input_box_start = '<div className="p-3 bg-zinc-900 border-t border-zinc-800 relative">'

if input_box_start in content:
    content = content.replace(input_box_start, '          )}\n          ' + input_box_start)
    with open('src/pages/Interview.tsx', 'w') as f:
        f.write(content)
    print("Patched right panel")
else:
    print("Could not find input box start")
