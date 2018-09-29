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
        const closedStatus = {fill:'red',shape:'dot',text:'closed'};
        const queueingStatus = {fill:yellow,shape:'ring',text:'queuing: 0'}
        const maxQueueLength = 100
        var qStatusText
        var qStatusLength
        var qStatusShape
        // Copy configuration items
        this.controlTopic = config.controlTopic.toLowerCase();
        this.openCmd = config.openCmd.toLowerCase();
        this.closeCmd = config.closeCmd.toLowerCase();
        this.toggleCmd = config.toggleCmd.toLowerCase();
        this.queueCmd = config.toggleCmd.toLowerCase();
        this.triggerCmd = config.triggerCmd.toLowerCase();
        this.flushCmd = config.flushCmd.toLowerCase();
        this.purgeCmed = config.purgeCmd.toLowerCase
        this.defaultCmd = config.defaultCmd.toLowerCase();
        this.defaultState = config.defaultState.toLowerCase();
        // Save "this" object
        var node = this
        // Initialize queue
        var queue = [];
        // Display gate status
        var state = node.defaultState;
        // Initialize status display
        switch (state) {
            case 'open':
                node.status(openStatus);
                break;
            case 'closed';
                node.status(closedStatus);
                break;
            default:
                node.status(queueingStatus);
        }
        // Process inputs
        node.on('input', function(msg) {
            var context = node.context();
            // Copy configuration items (moved)
            var state = context.get('state') || node.defaultState;
            // Change state
            if (msg.topic !== undefined && msg.topic.toLowerCase() === node.controlTopic) {
                switch (msg.payload.toLowerCase()) {
                    case node.openCmd:
                        state = 'open';
                        break;
                    case node.closeCmd:
                        state = 'closed';
                        break;
                    case node.queueCmd;
                        state = 'queueing';
                        break;
                    case node.toggleCmd:
                        if (state === 'open') {
                            state = 'closed';
                        } else if (state === 'closed') {
                            state = 'open';
                        }
                        break;
                    case node.triggerCmd:
                        if (state === 'queueing') {
                        // Dequeue
                        if (queue.length > 0) {
                            node.send(queue.pop);
                            }
                        }
                        break;
                    case node.flushCmd:
                        node.send(queue);
                        break;
                    case node.purgeCmd:
                        queue = [];
                        node.status(queueingStatus);
                        break;
                    case node.defaultCmd:
                        if (state === 'queueing') {
                            queue = [];
                            }
                        state = node.defaultState;
                        break;
                    default:
                        node.error('Invalid command');
                        break;
                }
                // Save state
                context.set('state',state);
                // Show status
                switch (state) {
                    case 'open':
                        node.status(openStatus);
                        break;
                    case 'closed':
                        node.status(closedStatus);
                        break;
                    case 'queueing':
                        node.status({fill:yellow,shape:'ring',text:'queuing: ' + queue.length});
                    }
                node.send(null);
            }
        });
            // Process message
            else {
                switch (state) {
                    case 'open':
                        node.send(msg);
                        break:
                    case 'closed':
                        node.send(null);
                        break;
                   case 'queueing':
                        // Enqueue
                        if (queue.length == maxQueueLength){
                            node.send(null);
                            qStatusShape = 'dot';
                        }
                        else {
                            queue.push(msg);
                            qStatusShape = 'ring';
                        }
                        qStatusLength = queue.length;
                        qStatusText = 'queuing: ' + qStatusLength;
                        node.status({fill:yellow,shape:qStatusShape,text:qStatusText});
                        }
                }
    }
    RED.nodes.registerType("q-gate",QueueGateNode);
}
