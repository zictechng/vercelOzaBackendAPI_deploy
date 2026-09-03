
// ------------------------------------------------
// idEncoder.js
// Base64url encode/decode for MongoDB _id
// Used in admin and user portal API responses
// Prevents exposing raw MongoDB ObjectIds in URLs
// Mobile app uses raw _id directly
// ------------------------------------------------

// Encode MongoDB _id for portal display/URLs
const encodeId = (id) => {
  if (!id) return '';
  return Buffer.from(id.toString()).toString('base64url');
};

// Decode encoded ID back to MongoDB _id string
const decodeId = (encoded) => {
  if (!encoded) return '';
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch (error) {
    return '';
  }
};

// Encode all _id fields in a document or array
const encodeDoc = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = encodeId(obj._id);
  return obj;
};

const encodeDocs = (docs) => {
  if (!Array.isArray(docs)) return docs;
  return docs.map(encodeDoc);
};

module.exports = { encodeId, decodeId, encodeDoc, encodeDocs };