import os
import json

paths = [
  r'C:\Users\jsoni\AppData\Roaming\clerk',
  r'C:\Users\jsoni\AppData\Roaming\clerk-cli',
  r'C:\Users\jsoni\AppData\Local\clerk-cli'
]

for base in paths:
  if os.path.exists(base):
    print(f'=== Files in {base} ===')
    for root, dirs, files in os.walk(base):
      for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, base)
        print(f' - {rel}')
        try:
          with open(full, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
            # Print non-secret keys / metadata
            if isinstance(data, dict):
              safe_info = {}
              for k, v in data.items():
                if any(sec in k.lower() for sec in ['secret', 'token', 'key', 'password']):
                  safe_info[k] = f'[MASKED length {len(str(v))}]'
                else:
                  safe_info[k] = v
              print('   Contents:', json.dumps(safe_info, indent=2))
        except Exception as e:
          print('   (Not json or unreadable)')
