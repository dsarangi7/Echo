// Browser builds never execute this. Transformers.js still imports the Node
// ONNX package at the top of its backend file, and Vite must resolve it.
const onnx = {
  env: { wasm: {} },
  InferenceSession: class InferenceSession {},
  Tensor: class Tensor {},
};

export default onnx;
export const env = onnx.env;
export const InferenceSession = onnx.InferenceSession;
export const Tensor = onnx.Tensor;
