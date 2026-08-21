"use strict";

/**
 * JavaScript runtime equivalents for the APIs described in the source file.
 * The original file was a TypeScript declaration fragment, so interfaces and
 * type aliases have no direct JavaScript output.
 */

const { Readable, Writable, Duplex } = require("node:stream");

/**
 * Adds a lazily generated stack trace to the supplied object.
 * Available in Node.js / V8 environments.
 *
 * @param {object} targetObject
 * @param {Function} [constructorOpt]
 */
function captureStackTrace(targetObject, constructorOpt) {
  if (typeof Error.captureStackTrace !== "function") {
    throw new Error("Error.captureStackTrace is not supported in this runtime.");
  }

  Error.captureStackTrace(targetObject, constructorOpt);
}

/**
 * Runs garbage collection when Node.js was started with --expose-gc.
 *
 * @param {{ execution?: "sync" | "async", type?: "major" | "minor" } | boolean} [options]
 * @returns {void | Promise<void>}
 */
function collectGarbage(options) {
  if (typeof global.gc !== "function") {
    throw new Error("Garbage collection is unavailable. Start Node.js with --expose-gc.");
  }

  return global.gc(options);
}

/**
 * Gets the current maximum number of captured stack frames.
 *
 * @returns {number}
 */
function getStackTraceLimit() {
  return Error.stackTraceLimit;
}

/**
 * Sets the maximum number of captured stack frames.
 *
 * @param {number} limit
 */
function setStackTraceLimit(limit) {
  Error.stackTraceLimit = limit;
}

module.exports = {
  captureStackTrace,
  collectGarbage,
  getStackTraceLimit,
  setStackTraceLimit,
  Readable,
  Writable,
  Duplex,
};
