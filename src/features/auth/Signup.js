"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const useAuth_1 = require("../../hooks/useAuth");
const Signup = () => {
    const { signup, loading } = (0, useAuth_1.useAuth)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const handleSubmit = (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        setError(null);
        try {
            yield signup(email, password);
            // Redirect or show success
        }
        catch (err) {
            setError(err.message || 'Signup failed');
        }
    });
    return (react_1.default.createElement("div", { className: "flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4" },
        react_1.default.createElement("form", { onSubmit: handleSubmit, className: "w-full max-w-sm bg-white p-8 rounded shadow-md" },
            react_1.default.createElement("h2", { className: "text-2xl font-bold mb-6 text-center" }, "Sign Up"),
            error && react_1.default.createElement("div", { className: "mb-4 text-red-500 text-sm" }, error),
            react_1.default.createElement("div", { className: "mb-4" },
                react_1.default.createElement("label", { className: "block mb-1 text-gray-700" }, "Email"),
                react_1.default.createElement("input", { type: "email", className: "w-full px-3 py-2 border rounded focus:outline-none focus:ring", value: email, onChange: e => setEmail(e.target.value), required: true, autoComplete: "email" })),
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("label", { className: "block mb-1 text-gray-700" }, "Password"),
                react_1.default.createElement("input", { type: "password", className: "w-full px-3 py-2 border rounded focus:outline-none focus:ring", value: password, onChange: e => setPassword(e.target.value), required: true, autoComplete: "new-password" })),
            react_1.default.createElement("button", { type: "submit", className: "w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mb-3", disabled: loading }, loading ? 'Signing up...' : 'Sign Up'),
            react_1.default.createElement("div", { className: "text-center text-sm mt-4" },
                "Already have an account? ",
                react_1.default.createElement("a", { href: "/login", className: "text-blue-600 hover:underline" }, "Login")))));
};
exports.default = Signup;
