{ Error: Command failed: ssh pi@192.168.50.103 "sudo nmcli connection up T-Mobile && curl https://api.ipify.org -s -S"
0|4gProxyAPI  | curl: (6) Could not resolve host: api.ipify.org
  at ChildProcess.exithandler (child_process.js:275:12)
  at emitTwo (events.js:126:13)
  at ChildProcess.emit (events.js:214:7)
  at maybeClose (internal/child_process.js:925:16)
  at Process.ChildProcess._handle.onexit (internal/child_process.js:209:5)
killed: false,
code: 6,
signal: null,
cmd: 'ssh pi@192.168.50.103 "sudo nmcli connection up T-Mobile && curl https://api.ipify.org -s -S"',
stdout: 'Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/16)\n',
stderr: 'curl: (6) Could not resolve host: api.ipify.org\n' }
