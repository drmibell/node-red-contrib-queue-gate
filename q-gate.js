/**
 * Copyright 2017-2020 M. I. Bell
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
 *
 * Modified by Simon Walters 31 Jul 2019 to select toggle behavior: open/closed or open/queueing
 * Modified by Colin Law 06 Apr 2020 to implement peek, drop, and status commands
 **/
module.exports = function(RED) {
    function QueueGateNode(config) {
        RED.nodes.createNode(this,config);
        const openStatus = {fill:'green',shape:'dot',text:'open'};
        const closedStatus = {fill:'red',shape:'ring',text:'closed'};
        var queueStatus = {fill:'yellow'};
        var maxQueueLength;
        // Copy configuration items
        this.controlTopic = config.controlTopic.toLowerCase();
        this.openCmd = config.openCmd.toLowerCase();
        this.closeCmd = config.closeCmd.toLowerCase();
        this.toggleCmd = config.toggleCmd.toLowerCase();
        this.qToggle = config.qToggle
        this.queueCmd = config.queueCmd.toLowerCase();
        this.triggerCmd = config.triggerCmd.toLowerCase();
        this.flushCmd = config.flushCmd.toLowerCase();
        this.resetCmd = config.resetCmd.toLowerCase();
        this.peekCmd = (config.peekCmd || "peek").toLowerCase();
        this.dropCmd = (config.dropCmd || "drop").toLowerCase();
        this.statusCmd = (config.statusCmd || "status").toLowerCase();
        this.defaultCmd = config.defaultCmd.toLowerCase();
        this.defaultState = config.defaultState.toLowerCase();
        this.maxQueueLength = config.maxQueueLength;
        this.keepNewest = config.keepNewest;
        this.persist = config.persist;
        // Save "this" object
        var node = this;
        var context = node.context();
        var persist = node.persist;
        var state = context.get('state');
        var queue = context.get('queue');
        if (!persist || typeof state === 'undefined') {
            state = node.defaultState;
            queue = [];
        }
        // Gate status & max queue size
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
                queueStatus.text = 'queuing: ' + queue.length;
                queueStatus.shape = (queue.length < node.maxQueueLength) ? 'ring':'dot';
                node.status(queueStatus);
                break;
            default:
                node.error('Invalid state');
        }
        // Process inputs
        node.on('input', function(msg) {
            var state = context.get('state') || node.defaultState;
            var queue = context.get('queue') || []
            if (typeof msg.topic === 'string' && msg.topic.toLowerCase() === node.controlTopic) {
            // Change state
                switch (msg.payload.toString().toLowerCase()) {
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
                        if (!node.qToggle) {
                            switch (state) {
                                case 'open':
                                    state = 'closed';
                                    break;
                                case 'closed':
                                    state = 'open';
                                    break;
                            }
                        } else {
                            switch (state) {
                                case 'open':
                                    state = 'queueing';
                                    break;
                                case 'queueing':
                                    node.send([queue]);
                                    queue =[];
                                    state = 'open';
                                    break;
                            }
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
                    case node.peekCmd:
                        if (state === 'queueing') {
                        // Send oldest but leave on queue
                        if (queue.length > 0) {
                            node.send(queue[0]);
                            }
                        }
                        break;
                    case node.dropCmd:
                        if (state === 'queueing') {
                        // Remove oldest from queue but don't send anything
                        if (queue.length > 0) {
                            queue.shift();
                            }
                        }
                        break;
                    case node.statusCmd:
                        // just show status, so do nothing here
                        break;
                    case node.flushCmd:
                        node.send([queue]);
                    case node.resetCmd:
                        queue = [];
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
                        queueStatus.text = 'queuing: ' + queue.length;
                        queueStatus.shape = (queue.length < node.maxQueueLength) ? 'ring':'dot';
                        node.status(queueStatus);
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
                        queueStatus.text = 'queuing: ' + queue.length;
                        queueStatus.shape = (queue.length < node.maxQueueLength) ? 'ring':'dot';
                        node.status(queueStatus);
                        break;
                    default:
                        node.error('Invalid state');
                    }
                }
            })
        }
    RED.nodes.registerType("q-gate",QueueGateNode);
}
