/**
 * Copyright 2018-2021 M. I. Bell
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
"use strict"
module.exports = function(RED) {
    function QueueGateNode(config) {
        RED.nodes.createNode(this,config);
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
        this.storeName = config.storeName

        var node = this;
        var context = node.context();
        var persist = node.persist;
        var storeName = node.storeName
        const openStatus = {fill:'green',shape:'dot',text:'open'};
        const closedStatus = {fill:'red',shape:'ring',text:'closed'};
        var queueStatus = {fill:'yellow'};

        context.get(['state','queue'],storeName,function(err,state,queue) {
            if (err) {
                node.error('startup error reading from context store: ' + storeName)
            } else if (!persist || typeof state === 'undefined') {
                state = node.defaultState
                queue = []
            }
            if (node.maxQueueLength <= 0) {
                node.maxQueueLength = Infinity;
            }
            switch (state) {    // initialize status display
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
                    node.error('Invalid state: ' + state);
            }
            context.set(['state','queue'],[state,queue],storeName,function(err) {
                if (err) {
                    node.error('startup error writing to context store: ' + storeName)
                }
            })
        })

        node.on('input', function(msg) {
            context.get(['state','queue'],storeName,function(err,state,queue) {
                if (err){
                    node.error('message error reading from context store: ' + storeName)
                } else if (typeof msg.topic === 'string' && 
                        msg.topic.toLowerCase() === node.controlTopic) {    // change state
                    if (typeof msg.payload === 'undefined' || msg.payload === null) {
                        msg.payload = '';
                    }
                    switch (msg.payload.toString().toLowerCase()) {
                        case node.openCmd:  // flush then open
                            node.send([queue]);
                            queue =[];
                            state = 'open';
                            break;
                        case node.closeCmd: // reset then close
                            queue = [];
                            state = 'closed';
                            break;
                        case node.queueCmd:
                            state = 'queueing';
                            break;
                        case node.toggleCmd:
                            if (!node.qToggle) {    // default toggle
                                switch (state) {
                                    case 'open':
                                        state = 'closed';
                                        break;
                                    case 'closed':
                                        state = 'open';
                                        break;
                                }
                            } else {
                                switch (state) {    // optional toggle
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
                            if (state === 'queueing') { // dequeue
                            if (queue.length > 0) {
                                node.send(queue.shift());
                                }
                            }
                            break;
                        case node.peekCmd:  // send clone of oldest, leave on queue
                            if (state === 'queueing') {
                            if (queue.length > 0) {
                                node.send(RED.util.cloneMessage(queue[0]));
                                }
                            }
                            break;
                        case node.dropCmd:  // remove oldest from queue
                            if (state === 'queueing') {
                            if (queue.length > 0) {
                                queue.shift();
                                }
                            }
                            break;
                        case node.statusCmd:    // refresh status
                            break;
                        case node.flushCmd:
                            node.send([queue]);
                        case node.resetCmd:
                            queue = [];
                            break;
                        case node.defaultCmd:   // reset then default
                            queue = [];
                            state = node.defaultState;
                            break;
                        default:
                            node.warn('Invalid command ignored');
                            break;
                    }
                    switch (state) {    // show status
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
                    } else {
                    switch (state) {    // process message
                        case 'open':
                            node.send(msg);
                            break;
                        case 'closed':
                            break;
                        case 'queueing':    // enqueue
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
                            node.error('Invalid state: ' + state);
                    }
                    
                }
                context.set(['state','queue'],[state,queue],storeName,function(err) {
                    if (err) {
                        node.error('message error writing to context store: ' + storeName,msg)
                    }
                })                            
            })
        })
    }
    RED.nodes.registerType("q-gate",QueueGateNode);
}
