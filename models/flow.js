const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema({
  from: String, // nodeId:port (ex: "n1:out")
  to:   String, // nodeId:port (ex: "n2:in")
}, {_id:false});

const NodeSchema = new mongoose.Schema({
  id: String,
  type: { type: String, default: 'message' }, // start|message|delay|condition|action
  x: Number,
  y: Number,
  data: { type: Object, default: {} } // título, conteúdo, etc.
}, {_id:false});

const FlowSchema = new mongoose.Schema({
  userId: { type: String, index: true }, // opcional: amarra no usuário
  name:   { type: String, default: 'Novo Fluxo' },
  nodes:  { type: [NodeSchema], default: [] },
  edges:  { type: [EdgeSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Flow', FlowSchema);
