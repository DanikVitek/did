/**
 * Represents a result of an operation that may fail.
 * Can be either `Ok` or `Err`.
 */
export type Result<T, E> = { isOk: true; value: T } | { isOk: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
    return {isOk: true, value};
}

export function Err<E>(error: E): Result<never, E> {
    return {isOk: false, error};
}

export function isOk<T, E>(result: Result<T, E>): result is { isOk: true; value: T } {
    return result.isOk;
}

export function isErr<T, E>(result: Result<T, E>): result is { isOk: false; error: E } {
    return !result.isOk;
}

export function unwrap<T, E>(result: Result<T, E>): T {
    if (isOk(result)) {
        return result.value;
    }
    throw new Error("Called `unwrap()` on an `Err` value");
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
    if (isErr(result)) {
        return result.error;
    }
    throw new Error("Called `unwrapErr()` on an `Ok` value");
}

export function map<T, U, E>(
    result: Result<T, E>,
    mapper: (value: T) => U,
): Result<U, E> {
    return isOk(result)
        ? Ok(mapper(result.value))
        : result;
}

export function flatMap<T, U, E>(
    result: Result<T, E>,
    mapper: (value: T) => Result<U, E>,
): Result<U, E> {
    return isOk(result)
        ? mapper(result.value)
        : result;
}
