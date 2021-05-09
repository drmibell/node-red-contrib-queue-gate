# node-red-contrib-queue-gate
A Node-RED node for controlling message flow, with queueing capability

## Install

Use the Node-RED `Manage Palette` command or run the following in your Node-RED user directory (typically `~/.node-red`):

    npm install node-red-contrib-queue-gate

## Usage

The `q-gate` node is similar to the `gate` node published as [node-red-contrib-simple-gate](https://flows.nodered.org/node/node-red-contrib-simple-gate) but with the added capability of queueing messages and releasing them on demand. 

The node will transmit the input message to its output when in the `open` state and block it when `closed`. In the `queueing` state, the input message is added to the end of the message queue, provided space is available.  Messages in the queue can be released in the order received, either singly or the entire queue at once. Alternatively, the oldest message in the queue can be sent without releasing it, or the oldest message can be removed from the queue without sending it on.

The user can limit the size of the queue to prevent memory problems. Messages arriving when the queue is full are discarded by default, so that the queue contains the oldest messages. Since version 1.1.0, however, the user can select the `Keep newest messages` checkbox to have new messages added to the queue (at the tail), while discarding the oldest message (from the head), so that the queue contains the most recent messages. This feature makes it possible to retain only the latest message and deliver it on request, as shown in the example below.

Messages with the user-defined topic `Control Topic` (set when the node is deployed) are not passed through but are used to control the state of the gate or the queue.

Control messages can have values representing commands that change the state of the gate: `open`, `close`, `toggle`, `queue`, or `default`. Messages that control or monitor the queue are `trigger`, `flush`, `peek`, `drop`, and `reset`. The `status` command forces the node status to be refreshed. The (case-insensitive) strings representing these commands are set by the user when the node is deployed. Since version 1.4.0, if a control message is received with a payload that is a number or boolean, the payload is converted to a string and then tested against the command definitions. If a control message is received but not recognized, there is no output or change of state, and the node reports an error.

The `peek` command sends the oldest message but does not remove it from the queue; the `drop` command removes the oldest message from the queue without sending it.  The two may be used together to get the oldest message, perform some action, and then remove it from the queue only when it has been successfully serviced. This is illustrated in the Retain Until Processed example below. The `status` command can be used in conjunction with a Status node to obtain the current state of the gate or the number of messages in the queue. This is shown in the Basic Operation flow. (Thanks to Colin Law for suggesting and implementing these commands.)

The `renege` command is used to remove specific messages from the queue based on a  property supplied in `msg.renege` for example to remove a message with a `userId` of `123` you would set `msg.renege` to `{"payload" : { "userId" : 123}}` The object should contain the path to the property and the value that matches the message or messages that you want to remove this can be any part of the message eg topic or payload.
The property cannot contain any array/index values only the path of an object property. If you change the value of the  command eg to `foo` then the object that contains the property will also change eg to `msg.foo`

When first deployed or after a `default` command, the gate is in the user-selected state defined by `Default State`. (See below regarding persistence.) When a valid control message is received, the gate performs one of the following actions, depending on its state:

A queue can may have a `TTL` value set which is the number of miliseconds that a message will wait in the queue before it expires, set this to `0` to disable message expiry. The `_msgid` of an expired message is written as an INFO event in the NodeRED log.

<p align="center"> <img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/actions.png?raw=true" width="85%"></p>

The actions available in the `queueing` state are defined by:

<p align="center"> <img  src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/definitions.png?raw=true" width="85%"></p>


The specified behaviors of the `queueing` state (flush before opening, reset before closing, and reset before default) can be reversed by sending a sequence of commands, i.e., [reset, open], [flush, close] or [flush, default].

Since version 1.3.0, the effect of the `toggle` command depends on the option selected using the `Toggle between open and queueing` checkbox. In the default (unchecked) case, the node toggles between the `open` and `closed` states. When the option is selected, the node toggles between the `open` and `queueing` states, with the queue being flushed each time the `open` state is entered. (Thanks to Simon Walters for suggesting and helping to implement this feature.)

Users should be aware that in each of the three states the node will not respond to one or more types of control message (indicated by `nop` in table). This should be taken into account when selecting the `Default State` and designing flows.

## Node status
The state of the gate is indicated by a status object: 

<p align="center"> <img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/status.png?raw=true" width="85%"></p>

where n = the number of messages in the queue.

## State persistence (since version 1.2.0)
By default, the node enters the `Default State` on startup, either when first deployed in the editor, re-deployed as part of a modified flow or entire workspace, or when Node-RED is restarted by the user or by a system service. If the `Default State` is `queueing`, the message queue will be empty. The state of the node is maintained in the node context, and if a persistent (non-volatile) form of context storage is available, the user has the option of restoring the state from that storage. This is done by activating the 
`Restore from state saved in` option (checkbox) in the edit dialog and choosing a non-volatile storage module from the adjacent dropdown list. (The list shows all the storage modules enabled in the Node-RED `settings.js` file.) If the saved state is `queueing`, the message queue will be also be restored. If for any reason the node is unable to retrieve valid state information, it will enter the `Default State`. (Note: versions prior to 1.5.0 were able to use only the default context store, so that state persistence was possible only when that store was non-volatile.)

## Examples
### Basic Operation
This flow demonstrates the basic operation of the `q-gate` node and the commands that can be used to change or display its state or manage the queue.

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

### Retain Until Processed (since version 1.4.0)
This flow uses the `peek` and `drop` commands in order to: release the oldest message without deleting it from the queue, process it (here simply waiting 5 seconds for demonstration purposes), then remove it from the head of the queue and release the next message. Processing stops once the queue is empty.

```
[{"id":"9899bb48.7f52c","type":"q-gate","z":"e5c32195.7ce7b8","name":"q-gate","controlTopic":"control","defaultState":"queueing","openCmd":"open","closeCmd":"close","toggleCmd":"toggle","queueCmd":"queue","defaultCmd":"default","triggerCmd":"trigger","flushCmd":"flush","resetCmd":"reset","peekCmd":"peek","dropCmd":"drop","statusCmd":"status","maxQueueLength":"100","keepNewest":false,"qToggle":false,"persist":false,"x":330,"y":200,"wires":[["5f8f8bcb.2d05ac"]]},{"id":"590746c1.caebb","type":"debug","z":"e5c32195.7ce7b8","name":"output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":610,"y":160,"wires":[]},{"id":"1c2bf5c0.966812","type":"inject","z":"e5c32195.7ce7b8","name":"inject messages","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":160,"y":160,"wires":[["9899bb48.7f52c"]]},{"id":"61ff61a5.40e45","type":"inject","z":"e5c32195.7ce7b8","name":"start processing","topic":"control","payload":"peek","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":160,"y":200,"wires":[["9899bb48.7f52c"]]},{"id":"5f8f8bcb.2d05ac","type":"delay","z":"e5c32195.7ce7b8","name":"process","pauseType":"delay","timeout":"5","timeoutUnits":"seconds","rate":"1","nbRateUnits":"1","rateUnits":"second","randomFirst":"1","randomLast":"5","randomUnits":"seconds","drop":false,"x":460,"y":200,"wires":[["590746c1.caebb","d7383276.654278"]]},{"id":"10ce59bb.a439ae","type":"link out","z":"e5c32195.7ce7b8","name":"","links":["d702a195.4ac318"],"x":715,"y":240,"wires":[]},{"id":"d702a195.4ac318","type":"link in","z":"e5c32195.7ce7b8","name":"","links":["10ce59bb.a439ae"],"x":215,"y":240,"wires":[["9899bb48.7f52c"]]},{"id":"d7383276.654278","type":"function","z":"e5c32195.7ce7b8","name":"get next","func":"node.send({topic: \"control\", payload: \"drop\"})\nmsg.topic = \"control\"\nmsg.payload = \"peek\"\nreturn msg;","outputs":1,"noerr":0,"x":620,"y":200,"wires":[["10ce59bb.a439ae"]]}]
```

<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-retain.png?raw=true"/>

## Author
[Mike Bell](https://www.linkedin.com/in/drmichaelbell/) (drmike)
## Contributors
[Simon Walters](https://github.com/cymplecy) (cymplecy)

[Colin Law](https://github.com/colinl) (colinl)
