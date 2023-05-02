import {Err, isErr, Ok, unwrap, unwrapErr} from "../result";
import {pair, withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import {LEFT_BRACKET, RIGHT_BRACKET} from "./common_parsers";
import {listOfEntries, parseASTNode} from "./composite_parsers";
import Context, {whitespaceOffset} from "./Context";

export default class ListNode extends ASTNode {
    constructor(public readonly entries: ASTNode[], context: Context) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[ListNode, Context]> {
        const parseResult = parseList(input, context);
        if (isErr(parseResult)) {
            return Err(new ParseError(
                `список вузлів (${unwrapErr(parseResult)})`,
                input,
                new CustomError("Розбір списку вузлів"),
            ));
        }
        const [rest, [entries, newContext]] = unwrap(parseResult);
        return Ok([rest, [new ListNode(entries, context), newContext]]);
    }

    toString(): string {
        return `ListNode(${this.entries})`;
    }
}

const LIST_START = pair(LEFT_BRACKET, whitespaceOffset);
const LIST_END = pair(whitespaceOffset, RIGHT_BRACKET);

function parseList(input: string, context: Context): IResult<[ASTNode[], Context]> {
    const parseResult = withError(
        LIST_START,
        new ParseError("[", input, new CustomError("Розбір початку списку")),
    )(input);
    if (isErr(parseResult)) {
        return parseResult;
    }
    const [rest, [, offset]] = unwrap(parseResult);
    let newContext = context.addColumns(1).addRows(offset.rows).addColumns(offset.columns);
    const entriesResult = listOfASTNodeEntries(rest, newContext);
    if (isErr(entriesResult)) {
        return entriesResult;
    }
    const [rest2, [entries, newContext1]] = unwrap(entriesResult);
    const endResult = withError(
        LIST_END,
        new ParseError("]", rest2, new CustomError("Розбір кінця списку")),
    )(rest2);
    if (isErr(endResult)) {
        return endResult;
    }
    const [rest3, [offset2]] = unwrap(endResult);
    newContext = newContext1.addRows(offset2.rows).addColumns(offset2.columns + 1);

    return Ok([rest3, [entries, newContext]]);
}

function listOfASTNodeEntries(input: string, context: Context): IResult<[ASTNode[], Context]> {
    return listOfEntries(input, context, parseASTNode);
}
