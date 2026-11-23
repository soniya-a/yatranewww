import os
import glob

home = os.path.expanduser('~')
print('Checking home directory for clerk files/dirs:')
for p in glob.glob(os.path.join(home, '*clerk*')):
  print(' -', p)
for p in glob.glob(os.path.join(home, '.*clerk*')):
  print(' -', p)

appdata = os.environ.get('APPDATA', '')
localappdata = os.environ.get('LOCALAPPDATA', '')

print('\nChecking APPDATA:')
for p in glob.glob(os.path.join(appdata, '*clerk*')):
  print(' -', p)

print('\nChecking LOCALAPPDATA:')
for p in glob.glob(os.path.join(localappdata, '*clerk*')):
  print(' -', p)

print('\nChecking current project dir:')
for p in os.listdir('.'):
  if 'clerk' in p.lower():
    print(' -', p)
