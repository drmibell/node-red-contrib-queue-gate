/**
 * Copyright 2018-2020 M. I. Bell
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
        var maxQueueLength; // debug: is this needed?
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
        this.renegeCmd = (config.renegeCmd || "renege").toLowerCase();
        this.defaultCmd = config.defaultCmd.toLowerCase();
        this.defaultState = config.defaultState.toLowerCase();
        this.maxQueueLength = config.maxQueueLength;
        this.keepNewest = config.keepNewest;
        this.persist = config.persist;
        this.storeName = config.storeName;
        this.ttl = config.ttl
        // Save "this" object
        var node = this;
        var context = node.context();
        var persist = node.persist;
        var storeName = node.storeName
        var state = context.get('state',storeName);
        var queue = context.get('queue',storeName);
        var expirejobs = context.get('expirejobs',storeName);
        if (!persist || typeof state === 'undefined') {
            state = node.defaultState;
            queue = [];
            expirejobs = {};
        }
        // Gate status & max queue size
        context.set('state',state,storeName);
        context.set('queue',queue,storeName);
        context.set('expirejobs',expirejobs,storeName);
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
            var state = context.get('state',storeName) || node.defaultState;
            var queue = context.get('queue',storeName) || [];
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
                            node.send(RED.util.cloneMessage(queue[0]));
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
                        node.warn('Invalid command ignored');
                        break;
                    case node.renegeCmd:
                    // Filter messages from queue
                        var f = msg[node.renegeCmd]
                        var k = getPath(f)
                        var v = eval('f.'+k.join('.') )
                        var r = []
                        // create array of  msg indexes matching filter from queue
                        queue.filter(function(itm, indx){
                            if (eval('itm.'+k.join('.')) == v){
                                r.push(indx)
                            }
                        });
                        //remove indexes in r from queue
                        r.reverse().forEach(i => {
                            queue.splice(i, 1)
                        });
                        break
                }
                // Save state
                context.set('state',state,storeName);
                context.set('queue',queue,storeName);
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
                        // Check if TTL is set and use setTimeout to expire message
                        if (node.ttl != 0){
                            msg._qttlid = RED.util.generateId()
                            setTimeout(expire, node.ttl, msg._qttlid, queue, node, storeName)
                        }
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
        function getPath(obj) {
            for(var key in obj) {                                   // for each key in obj (obj is either an object or an array)
                if(obj[key] && typeof obj[key] === "object") {      // if the current property (value of obj[key]) is also an object/array
                    var path = getPath(obj[key]);                    // try finding item in that object
                    if(path) {                                    // if we find it
                        path.unshift(key);                        // we shift the current key to the path array (result will be an array of keys)
                        return path;                              // and we return it to our caller
                    }
                } else if(typeof(obj[key]) != 'object') {           // otherwise (if obj[key] is not an object or array) we check if it is the item we're looking for
                    return [key];                                   // if it is then we return the path array (this is where the path array get constructed)
                }
            }
        }

        function expire(id, queue, node, storeName){
            queue.filter(function(itm, indx){
                if (itm._qttlid == id){                             // Check for msg with _qttlid in the queue
                    var m = queue.splice(indx, 1)                   // Remove message from queue
                    node.log("Expiring: "+m._msgid);                // Log the _msgid to INFO log
                    let queueStatus = {fill:'yellow'};              // Update queueStatus
                    queueStatus.text = 'queuing: ' + queue.length;
                    queueStatus.shape = (queue.length < node.maxQueueLength) ? 'ring':'dot';
                    node.status(queueStatus);                       // Set status
                    
                }
            });
            
        }

    RED.nodes.registerType("q-gate",QueueGateNode);
}
