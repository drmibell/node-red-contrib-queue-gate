# node-red-contrib-queue-gate
A Node-RED node for controlling message flow, with queueing capability

## Install

Run the following command in your Node-RED user directory (typically `~/.node-red`):

    npm install node-red-contrib-queue-gate

## Usage

The `q-gate` node is similar to the `gate` node published as `node-red-contrib-simple-gate` but with the added capability of queueing messages and releasing them when triggered. 

The node will transmit the input message to its output when in the `open` state and block it when `closed`. In the `queueing` state, the input message is added to the end of the message queue, provided space is available. The user can limit the size of the queue to prevent memory problems. Messages in the queue can be released (in the order received) either singly or the entire queue at once.

Messages with the user-defined topic `Control Topic` (set when the node is deployed) are not passed through but are used to control the state of the gate or the queue.

Control messages can have values representing commands that change the state of the gate: `open`, `close`, `toggle`, `queue`, or `default` Messages that control the queue are `trigger`, `flush` and `purge`. The (case-insensitive) strings representing these commands are set by the user when the node is deployed. If a control message is received but not recognized, there is no output or change of state, and the node reports an error.

When first deployed or after a `default` command, the gate is in the user-selected state defined by `Default State`. When a valid control message is received, the gate performs one of the following actions:
<p align="center">
  <img width="85%" src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/actions.png">
</p>
where flush = send all queued messages; purge = delete all queued messages; dequeue = send oldest message in queue

The specified behaviors of the queuing state (flush before opening, purge before closing, and purge before default) can be reversed by sending a sequence of commands, i.e., [purge, open], [flush, close] or [flush, default].

## Node status
The state of the gate is indicated by a status object: 
<p align="center">
<img width="85%" src="https://github.com/drmibell/node-red-contrib-queue-gate/blob/master/images/status.png")</p>

where n = the number of messages in the queue

