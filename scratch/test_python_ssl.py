import socket
import ssl

try:
    s = socket.create_connection(('77.113.7.222', 5432), timeout=5)
    print('Python socket connected!')
    s.sendall(b'\x00\x00\x00\x08\x04\xd2\x16\x2f')
    resp = s.recv(1)
    print('Python SSLRequest reply:', resp)
except Exception as e:
    print('Python exception:', type(e), e)
