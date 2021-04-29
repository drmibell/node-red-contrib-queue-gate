# node-red-contrib-queue-gate
A Node-RED node for controlling message flow, with queueing capability

## Install

Use the Node-RED `Manage Palette` command or run the following in your Node-RED user directory (typically `~/.node-red`):

    npm install node-red-contrib-queue-gate

## Usage

The `q-gate` node is similar to the `gate` node published as [node-red-contrib-simple-gate](https://flows.nodered.org/node/node-red-contrib-simple-gate) but with the added capability of queueing messages and releasing them on demand. 

The node will transmit the input message to its output when in the `open` state and block it when `closed`. In the `queueing` state, the input message is added to the end of the message queue, provided space is available.  Messages in the queue can be released in the order received, either singly or the entire queue at once. Alternatively, the oldest message in the queue can be sent without releasing it, or the oldest message can be removed from the queue without sending it on.

The user can limit the size of the queue to prevent memory problems. Messages arriving when the queue is full are discarded by default, so that the queue contains the oldest messages. Since version 1.1.0, however, the user can select the `Keep newest messages` checkbox to have new messages added to the queue (at the tail), while discarding the oldest message (from the head), so that the queue contains the most recent messages. This feature makes it possible to retain only the latest message and deliver it on request, as shown in the *Save Most Recent* example below.

Messages with the user-defined topic `Control Topic` (set when the node is deployed) are not passed through but are used to control the state of the gate or the queue.

Control messages can have values representing commands that change the state of the gate: `open`, `close`, `toggle`, `queue`, or `default`. Messages that control or monitor the queue are `trigger`, `flush`, `peek`, `drop`, and `reset`. The `status` command forces the node status to be refreshed. The (case-insensitive) strings representing these commands are set by the user when the node is deployed. Since version 1.4.0, if a control message is received with a payload that is a number or boolean, the payload is converted to a string and then tested against the command definitions. If a control message is received but not recognized, there is no output or change of state, and the node issues a warning.

The `peek` command sends the oldest message but does not remove it from the queue; the `drop` command removes the oldest message from the queue without sending it.  The two may be used together to get the oldest message, perform some action, and then remove it from the queue only when it has been successfully serviced. This is illustrated in the *Retain Until Processed* example below. The `status` command can be used in conjunction with a Status node to obtain the current state of the gate or the number of messages in the queue. This is shown in the *Basic Operation* flow. (Thanks to Colin Law for suggesting and implementing these commands.)

When first deployed or after a `default` command, the gate is in the user-selected state defined by `Default State`. (See below regarding persistence.) When a valid control message is received, the gate performs one of the following actions, depending on its state:

<p align="center"> <img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/actions.png?raw=true" width="85%"></p>

The actions available in the `queueing` state are defined by:

<p align="center"> <img  src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/definitions.png?raw=true" width="85%"></p>


The specified behaviors of the `queueing` state (flush before opening, reset before closing, and reset before default) can be reversed by sending a sequence of commands, i.e., [reset, open], [flush, close] or [flush, default].

The effect of the `toggle` command depends on the option selected using the `Toggle between open and queueing` checkbox. In the default (unchecked) case, the node toggles between the `open` and `closed` states. When the option is selected, the node toggles between the `open` and `queueing` states, with the queue being flushed each time the `open` state is entered. (Thanks to Simon Walters for suggesting and helping to implement this feature.)

Users should be aware that in each of the three states the node will not respond to one or more types of control message (indicated by `nop` in table). This should be taken into account when selecting the `Default State` and designing flows.

## Node status
The state of the gate is indicated by a status object: 

<p align="center"> <img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/status.png?raw=true" width="85%"></p>

where n = the number of messages in the queue.

## State persistence
By default, the node enters the `Default State` on startup, either when first deployed in the editor, re-deployed as part of a modified flow or entire workspace, or when Node-RED is restarted by the user or by a system service. If the `Default State` is `queueing`, the message queue will be empty. The state of the node is maintained in the node context, and if a persistent (non-volatile) form of context storage is available, the user has the option of restoring the state from that storage. This is done by activating the 
`Restore from state saved in` option (checkbox) in the edit dialog and choosing a non-volatile storage module from the adjacent dropdown list. (The list shows all the storage modules enabled in the Node-RED `settings.js` file.) If the saved state is `queueing`, the message queue will be also be restored. If for any reason the node is unable to retrieve valid state information, it will enter the `Default State`. (Note: versions prior to 1.5.0 were able to use only the default context store, so that state persistence was possible only when that store was non-volatile.)

## Version History
Over time, various features have been added to this node. Early on, the documentation  identified which version introduced a given capability. Eventually, the changes became so numerous that such information is of little value. In general, users are urged to use the most recent available version of the node and to report any issues encountered in upgrading. If needed, the revision history can be found in the [CHANGELOG](https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/CHANGELOG.md) document.

## Examples
These flows can be loaded into the editor from the Examples section of the  Import sub-menu or downloaded from  [GitHub](https://github.com/drmibell/node-red-contrib-queue-gate/tree/master/examples).

### Basic Operation ([q-gate-demo.json](https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/examples/q-gate-demo.json))
This flow demonstrates the basic operation of the `q-gate` node and the commands that can be used to change or display its state or manage the queue.

<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-demo.png?raw=true"/>

### Save Most Recent Message ([q-gate-most-recent.json](https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/examples/q-gate-most-recent.json))

This flow, as noted above, saves the most recent message in the queue and releases it when a `trigger`, `flush`, or `open` command is received. (Note that if the `open` command is used, the gate will remain open until a `queue` or `default` command is received to restore the original mode of operation.) The `q-gate` is configured with `Default State = queueing`, `Maximum Queue Length = 1`, and `Keep Newest Messages = true`.

<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-keep-newest.png?raw=true"/>

### Retain Until Processed ([q-gate-retain.json](https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/examples/q-gate-retain.json))
This flow uses the `peek` and `drop` commands in order to (1) release the oldest message without deleting it from the queue, (2) process the message (here simply waiting 5 seconds for demonstration purposes), and then (3) remove it from the head of the queue and release the next message. Processing stops once the queue is empty.

<img src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/screenshots/q-gate-retain.png?raw=true"/>

## Author
[Mike Bell](https://www.linkedin.com/in/drmichaelbell/) (drmike)
## Contributors
[Simon Walters](https://github.com/cymplecy) (cymplecy)

[Colin Law](https://github.com/colinl) (colinl)
