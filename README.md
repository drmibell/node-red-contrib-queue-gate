# node-red-contrib-queue-gate
A Node-RED node for controlling message flow, with queueing capability

## Install

Use the Node-RED `Manage Palette` command or run the following in your Node-RED user directory (typically `~/.node-red`):

    npm install node-red-contrib-queue-gate

## Usage

The `q-gate` node is similar to the `gate` node published as [node-red-contrib-simple-gate](https://flows.nodered.org/node/node-red-contrib-simple-gate) but with the added capability of queueing messages and releasing them when triggered. 

The node will transmit the input message to its output when in the `open` state and block it when `closed`. In the `queueing` state, the input message is added to the end of the message queue, provided space is available.  Messages in the queue can be released (in the order received) either singly or the entire queue at once.

The user can limit the size of the queue to prevent memory problems. Messages arriving when the queue is full are discarded by default, so that the queue contains the oldest messages. Since version 1.1.0, however, the user can select the `Keep newest messages` checkbox to have new messages added to the queue (at the tail), while discarding the oldest message (from the head), so that the queue contains the most recent messages. This feature makes it possible to retain only the latest message and deliver it on request, as shown in the example below.

Messages with the user-defined topic `Control Topic` (set when the node is deployed) are not passed through but are used to control the state of the gate or the queue.

Control messages can have values representing commands that change the state of the gate: `open`, `close`, `toggle`, `queue`, or `default`. Messages that control the queue are `trigger`, `flush`, and `reset`. The (case-insensitive) strings representing these commands are set by the user when the node is deployed. If a control message is received but not recognized, there is no output or change of state, and the node reports an error.

When first deployed or after a `default` command, the gate is in the user-selected state defined by `Default State`. When a valid control message is received, the gate performs one of the following actions:

<img  src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/actions.png?raw=true">
where flush = send all queued messages; reset = delete all queued messages; dequeue = send oldest message in queue.

The specified behaviors of the `queueing` state (flush before opening, reset before closing, and reset before default) can be reversed by sending a sequence of commands, i.e., [reset, open], [flush, close] or [flush, default].

## Node status
The state of the gate is indicated by a status object: 

<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/status.png?raw=true">

where n = the number of messages in the queue.

## State persistence (since version 1.2.0)
By default, the node enters the `Default State` on startup, either when first deployed in the editor, re-deployed as part of a modified flow or entire workspace, or when Node-RED is restarted by the user or by a system service. The user can, however, select the `Restore from saved state` option (checkbox) in the edit dialog. Then, if a persistent form of context storage has been enabled in the Node-RED `settings.js` file, the node will attempt to enter the state last saved in the node context and will use the `Default State` only if no saved state is available.

## Examples
### Basic Operation
This flow demonstrates the basic operation of the `q-gate` node and the commands that can be used to change its state or manage the queue.
```
[{"id":"e86716dc.75de9","type":"q-gate","z":"a7165960.a47ae","name":"q-gate demo","controlTopic":"control","defaultState":"open","openCmd":"open","closeCmd":"close","toggleCmd":"toggle","queueCmd":"queue","defaultCmd":"default","triggerCmd":"trigger","flushCmd":"flush","resetCmd":"reset","maxQueueLength":"5","x":510,"y":220,"wires":[["2ecfd2a4.7c6eee"]]},{"id":"41101774.7f8d98","type":"inject","z":"a7165960.a47ae","name":"input","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":230,"y":220,"wires":[["e86716dc.75de9"]]},{"id":"40d25bc1.d8f8c4","type":"inject","z":"a7165960.a47ae","name":"open","topic":"control","payload":"open","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":40,"wires":[["e86716dc.75de9"]]},{"id":"ad8d0a28.a3b218","type":"inject","z":"a7165960.a47ae","name":"toggle","topic":"control","payload":"toggle","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":120,"wires":[["e86716dc.75de9"]]},{"id":"aef911e9.8d1ce8","type":"inject","z":"a7165960.a47ae","name":"close","topic":"control","payload":"close","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":80,"wires":[["e86716dc.75de9"]]},{"id":"3551df65.8b711","type":"inject","z":"a7165960.a47ae","name":"default","topic":"control","payload":"default","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":160,"wires":[["e86716dc.75de9"]]},{"id":"2ecfd2a4.7c6eee","type":"debug","z":"a7165960.a47ae","name":"output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","x":670,"y":220,"wires":[]},{"id":"d75bf97a.b18a28","type":"inject","z":"a7165960.a47ae","name":"queue","topic":"control","payload":"queue","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":280,"wires":[["e86716dc.75de9"]]},{"id":"5734d644.111988","type":"inject","z":"a7165960.a47ae","name":"flush","topic":"control","payload":"flush","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":360,"wires":[["e86716dc.75de9"]]},{"id":"3b9ed807.975318","type":"inject","z":"a7165960.a47ae","name":"trigger","topic":"control","payload":"trigger","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":320,"wires":[["e86716dc.75de9"]]},{"id":"e0d27782.346e28","type":"inject","z":"a7165960.a47ae","name":"reset","topic":"control","payload":"reset","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":270,"y":400,"wires":[["e86716dc.75de9"]]}]
```
<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-demo.png?raw=true"/>

### Save Most Recent Message (since version 1.1.0)
This flow, as noted above, saves the most recent message in the queue and releases it when a `trigger`, `flush`, or `open` command is received. (Note that if the `open` command is used, the gate will remain open until a `queue` or `default` command is received to restore the original mode of operation.) The `q-gate` is configured with `Default State = queueing`, `Maximum Queue Length = 1`, and `Keep Newest Messages = true`.

```
[{"id":"448f47a3.0a19d","type":"inject","z":"12b96c09.50c26c","name":"open","topic":"control","payload":"open","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":310,"y":380,"wires":[["13957b44.e58a95"]]},{"id":"13957b44.e58a95","type":"q-gate","z":"12b96c09.50c26c","name":"","controlTopic":"control","defaultState":"queueing","openCmd":"open","closeCmd":"close","toggleCmd":"toggle","queueCmd":"queue","defaultCmd":"default","triggerCmd":"trigger","flushCmd":"flush","resetCmd":"reset","maxQueueLength":"1","x":500,"y":520,"wires":[["26031746.d5c2d"]]},{"id":"26031746.d5c2d","type":"debug","z":"12b96c09.50c26c","name":"output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","x":630,"y":520,"wires":[]},{"id":"3194a541.d71c22","type":"inject","z":"12b96c09.50c26c","name":"input","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":250,"y":520,"wires":[["13957b44.e58a95"]]},{"id":"2bf43a95.fc1ff6","type":"inject","z":"12b96c09.50c26c","name":"trigger","topic":"control","payload":"trigger","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":310,"y":460,"wires":[["13957b44.e58a95"]]},{"id":"c187bfac.72062","type":"inject","z":"12b96c09.50c26c","name":"flush","topic":"control","payload":"flush","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":310,"y":420,"wires":[["13957b44.e58a95"]]},{"id":"c87e4d5e.ed7448","type":"inject","z":"12b96c09.50c26c","name":"queue","topic":"control","payload":"queue","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":310,"y":580,"wires":[["13957b44.e58a95"]]},{"id":"214835eb.433f72","type":"inject","z":"12b96c09.50c26c","name":"default","topic":"control","payload":"default","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":310,"y":620,"wires":[["13957b44.e58a95"]]}]
```
<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-keep-newest.png?raw=true"/>

