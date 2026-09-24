import re

with open('src/pages/Interview.tsx', 'r') as f:
    content = f.read()

# Replace Room Graphics Controls block
# Look for: <span className="text-[9px] uppercase tracking-widest font-black text-cyan-400 font-mono">ROOM GRAPHICS CONTROLS</span>
start_str = 'ROOM GRAPHICS CONTROLS'

start_idx = content.find(start_str)
if start_idx != -1:
    # Find the enclosing <motion.div that starts before it
    motion_div_start = content.rfind('<motion.div', 0, start_idx)
    # Find the closing </motion.div> after it
    motion_div_end = content.find('</motion.div>', start_idx) + len('</motion.div>')
    
    if motion_div_start != -1 and motion_div_end != -1:
        new_content = content[:motion_div_start] + content[motion_div_end:]
        with open('src/pages/Interview.tsx', 'w') as f:
            f.write(new_content)
        print("Removed Room Graphics Controls")
    else:
        print("Could not find motion div boundaries")
else:
    print("Could not find Room Graphics Controls")
