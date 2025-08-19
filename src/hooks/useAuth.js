"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = __importDefault(require("react"));
const react_2 = require("react");
const firebase_1 = require("../services/firebase");
const auth_1 = require("firebase/auth");
const AuthContext = (0, react_2.createContext)(undefined);
function AuthProvider({ children }) {
    const authValue = useProvideAuth();
    return react_1.default.createElement(AuthContext.Provider, { value: authValue }, children);
}
exports.AuthProvider = AuthProvider;
const useAuth = () => {
    const context = (0, react_2.useContext)(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
exports.useAuth = useAuth;
function useProvideAuth() {
    const [user, setUser] = (0, react_2.useState)(null);
    const [loading, setLoading] = (0, react_2.useState)(true);
    (0, react_2.useEffect)(() => {
        (0, auth_1.setPersistence)(firebase_1.auth, auth_1.browserLocalPersistence);
        const unsubscribe = (0, auth_1.onAuthStateChanged)(firebase_1.auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    const signup = (email, password) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const result = yield (0, auth_1.createUserWithEmailAndPassword)(firebase_1.auth, email, password);
            setUser(result.user);
            return result.user;
        }
        catch (error) {
            setLoading(false);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    const login = (email, password) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const result = yield (0, auth_1.signInWithEmailAndPassword)(firebase_1.auth, email, password);
            setUser(result.user);
            return result.user;
        }
        catch (error) {
            setLoading(false);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    const loginWithGoogle = () => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            const provider = new auth_1.GoogleAuthProvider();
            const result = yield (0, auth_1.signInWithPopup)(firebase_1.auth, provider);
            setUser(result.user);
            return result.user;
        }
        catch (error) {
            setLoading(false);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    const logout = () => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        try {
            yield (0, auth_1.signOut)(firebase_1.auth);
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    });
    return {
        user,
        loading,
        signup,
        login,
        loginWithGoogle,
        logout,
    };
}
