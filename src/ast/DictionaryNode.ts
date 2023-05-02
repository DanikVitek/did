import {Err, isErr, Ok, unwrap} from "../result";
import {pair, withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import {LEFT_PAREN, RIGHT_PAREN} from "./common_parsers";
import {listOfEntries} from "./composite_parsers";
import Context, {whitespaceOffset} from "./Context";
import DictionaryEntryNode from "./DictionaryEntryNode";

export default class DictionaryNode extends ASTNode {
    constructor(public readonly entries: DictionaryEntryNode[], context: Context) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[DictionaryNode, Context]> {
        const parseResult = parseDictionary(input, context);
        if (isErr(parseResult)) {
            return Err(new ParseError("словник", input, new CustomError("Розбір словника")));
        }
        const [rest, [entries, newContext]] = unwrap(parseResult);
        return Ok([rest, [new DictionaryNode(entries, context), newContext]]);
    }

    toString(): string {
        return `DictionaryNode(${this.entries})`;
    }
}

export const DICTIONARY_START = pair(LEFT_PAREN, whitespaceOffset);
export const DICTIONARY_END = pair(whitespaceOffset, RIGHT_PAREN);

function parseDictionary(input: string, context: Context): IResult<[DictionaryEntryNode[], Context]> {
    const startParser = withError(
        DICTIONARY_START,
        new ParseError('(', input, new CustomError("Розбір початку словника")),
    )(input);
    if (isErr(startParser)) {
        return startParser;
    }
    const [rest, [, offset]] = unwrap(startParser);
    let newContext = context.addColumns(1).addRows(offset.rows).addColumns(offset.columns);
    const entriesParser = listOfDictionaryEntries(rest, newContext);
    if (isErr(entriesParser)) {
        return entriesParser;
    }
    const [rest2, [entries, newContext2]] = unwrap(entriesParser);
    const endParser = withError(
        DICTIONARY_END,
        new ParseError(')', rest2, new CustomError("Розбір кінця словника")),
    )(rest2);
    if (isErr(endParser)) {
        return endParser;
    }
    const [rest3, [offset2]] = unwrap(endParser);
    newContext = newContext2.addRows(offset2.rows).addColumns(offset2.columns + 1);
    return Ok([rest3, [entries, newContext]]);
}

function listOfDictionaryEntries(input: string, context: Context): IResult<[DictionaryEntryNode[], Context]> {
    return listOfEntries(input, context, DictionaryEntryNode.parse);
}