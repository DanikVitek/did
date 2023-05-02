import {Err, isErr, Ok, unwrap, unwrapErr} from "../result";
import {alt, tuple, withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError, Parser} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import {COMMA_TAG} from "./common_parsers";
import Context, {Offset, whitespaceOffset} from "./Context";
import DictionaryNode from "./DictionaryNode";
import EmptyNode from "./EmptyNode";
import ListNode from "./ListNode";
import LogicalNode from "./LogicalNode";
import NumberNode from "./NumberNode";
import ObjectNode from "./ObjectNode";
import TextNode from "./TextNode";

export function parseASTNode(input: string, context: Context): IResult<[ASTNode, Context]> {
    return withError(
        alt(
            (i => EmptyNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => LogicalNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => NumberNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => TextNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => ObjectNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => DictionaryNode.parse(i, context)) as Parser<[ASTNode, Context]>,
            (i => ListNode.parse(i, context)) as Parser<[ASTNode, Context]>,
        ),
        new ParseError(
            'щось з переліку: "пусто", "так", "ні", число, текст, об\'єкт, словник або список',
            input,
            new CustomError("Розбір вузла синтаксичного дерева"),
        ),
    )(input);
}

export const SEPARATOR_PARSER = tuple(whitespaceOffset, COMMA_TAG, whitespaceOffset);

export function listOfEntries<T extends ASTNode>(
    input: string,
    context: Context,
    entryParser: (input: string, context: Context) => IResult<[T, Context]>,
): IResult<[T[], Context]> {
    const entries: T[] = [];

    let rest = input;
    let entry: T;

    let wsOffset1: Offset;
    let wsOffset2: Offset;

    while (true) {
        const entryResult = entryParser(rest, context);
        if (isErr(entryResult)) {
            if (entries.length === 0) {
                return Ok([rest, [entries, context]]);
            }
            return Err(new ParseError(
                `елемент переліку (${unwrapErr(entryResult)})`,
                rest,
                new CustomError("Розбір елементу переліку"),
            ));
        }
        [rest, [entry, context]] = unwrap(entryResult);
        entries.push(entry);
        const sepResult = SEPARATOR_PARSER(rest);
        if (isErr(sepResult)) {
            break;
        }
        [rest, [wsOffset1, , wsOffset2]] = unwrap(sepResult);
        context = context
            .addRows(wsOffset1.rows)
            .addColumns(wsOffset1.columns + 1)
            .addRows(wsOffset2.rows)
            .addColumns(wsOffset2.columns);
    }
    return Ok([rest, [entries, context]]);
}
