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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFirestoreService = void 0;
const firestore_1 = require("firebase/firestore");
const config_1 = require("../firebase/config");
class BaseFirestoreService {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }
    get collection() {
        return (0, firestore_1.collection)(config_1.firebase.db, this.collectionName);
    }
    getAll(constraints = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const q = (0, firestore_1.query)(this.collection, ...constraints);
            const snapshot = yield (0, firestore_1.getDocs)(q);
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        });
    }
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = (0, firestore_1.doc)(this.collection, id);
            const snapshot = yield (0, firestore_1.getDoc)(docRef);
            return snapshot.exists() ? Object.assign({ id: snapshot.id }, snapshot.data()) : null;
        });
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = (0, firestore_1.doc)(this.collection);
            yield (0, firestore_1.setDoc)(docRef, data);
            return docRef.id;
        });
    }
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = (0, firestore_1.doc)(this.collection, id);
            yield (0, firestore_1.updateDoc)(docRef, data);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = (0, firestore_1.doc)(this.collection, id);
            yield (0, firestore_1.deleteDoc)(docRef);
        });
    }
}
exports.BaseFirestoreService = BaseFirestoreService;
