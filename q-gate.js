/**
 * Copyright 2017 M. I. Bell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
    function QueueGateNode(config) {
        RED.nodes.createNode(this,config);
        const openStatus = {fill:'green',shape:'dot',text:'open'};
        const closedStatus = {fill:'red',shape:'ring',text:'closed'};
        const queueingStatus = {fill:'yellow',shape:'ring',text:'queuing: 0'};
        var maxQueueLength;
        var qStatusText;
        var qStatusLength;
        var qStatusShape;
        // Copy configuration items
        this.controlTopic = config.controlTopic.toLowerCase();
        this.openCmd = config.openCmd.toLowerCase();
        this.closeCmd = config.closeCmd.toLowerCase();
        this.toggleCmd = config.toggleCmd.toLowerCase();
        this.queueCmd = config.queueCmd.toLowerCase();
        this.triggerCmd = config.triggerCmd.toLowerCase();
        this.flushCmd = config.flushCmd.toLowerCase();
        this.resetCmd = config.resetCmd.toLowerCase();
        this.defaultCmd = config.defaultCmd.toLowerCase();
        this.defaultState = config.defaultState.toLowerCase();
        this.maxQueueLength = config.maxQueueLength;
        this.keepNewest = config.keepNewest;
        // Save "this" object
        var node = this;
        // Gate status & max queue size
        var state = node.defaultState;
        var queue = [];
        var context = node.context();
        context.set('state',state);
        context.set('queue',queue);
        if (node.maxQueueLength <= 0) {
            node.maxQueueLength = Infinity;
        }
        // Initialize status display
        switch (state) {
            case 'open':
                node.status(openStatus);
                break;
            case 'closed':
                node.status(closedStatus);
                break;
            case 'queueing':
                node.status(queueingStatus);
                break;
            default:
                node.error('Invalid state');
        }
        // Process inputs
        node.on('input', function(msg) {
            var state = context.get('state') || node.defaultState;
            var queue = context.get('queue') || []
            if (msg.topic !== undefined && msg.topic.toLowerCase() === node.controlTopic) {
            // Change state
                switch (msg.payload.toLowerCase()) {
                    case node.openCmd:
                    // flush then open
                        node.send([queue]);
                        queue =[];
                        state = 'open';
                        break;
                    case node.closeCmd:
                    // reset then close
                        queue = [];
                        state = 'closed';
                        break;
                    case node.queueCmd:
                        state = 'queueing';
                        break;
                    case node.toggleCmd:
                        switch (state) {
                            case 'open':
                                state = 'closed';
                                break;
                            case 'closed':
                                state = 'open';
                                break;
                        }
                        break;
                    case node.triggerCmd:
                        if (state === 'queueing') {
                        // Dequeue
                        if (queue.length > 0) {
                            node.send(queue.shift());
                            }
                        }
                        break;
                    case node.flushCmd:
                        node.send([queue]);
                    case node.resetCmd:
                        queue = [];
                        node.status(queueingStatus);
                        break;
                    case node.defaultCmd:
                    // reset then default
                        queue = [];
                        state = node.defaultState;
                        break;
                    default:
                        node.error('Invalid command');
                        break;
                }
                // Save state
                context.set('state',state);
                context.set('queue',queue);
                // Show status
                switch (state) {
                    case 'open':
                        node.status(openStatus);
                        break;
                    case 'closed':
                        node.status(closedStatus);
                        break;
                    case 'queueing':
                        node.status({fill:'yellow',shape:'ring',text:'queuing: ' + queue.length});
                    }
                node.send(null);
            } else {
                // Process message
                switch (state) {
                    case 'open':
                        node.send(msg);
                        break;
                    case 'closed':
                        node.send(null);
                        break;
                    case 'queueing':
                        // Enqueue
                        if (queue.length < node.maxQueueLength) {
                            queue.push(msg);
                        } else {
                        if (node.keepNewest) {
                            queue.push(msg);
                            queue.shift();
                            }
                        }
                        if (queue.length < node.maxQueueLength) {
                            qStatusShape = 'ring';
                            } else {
                            qStatusShape = 'dot';
                            }
                        qStatusLength = queue.length;
                        qStatusText = 'queuing: ' + qStatusLength;
                        node.status({fill:'yellow',shape:qStatusShape,text:qStatusText});
                        break;
                    default:
                        node.error('Invalid state');
                    }
                }
            })
        }
    RED.nodes.registerType("q-gate",QueueGateNode);
}
