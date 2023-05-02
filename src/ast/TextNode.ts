import {Err, isErr, Ok, unwrap, unwrapErr} from "../result";
import {noneOf, oneOf, tag} from "../util_parsers/basic";
import {alt, delimited, many0, map, preceded, value, withError} from "../util_parsers/combinator";
import {CustomError, IResult, ParseError} from "../util_parsers/types";
import ASTNode from "./ASTNode";
import Context from "./Context";

export default class TextNode extends ASTNode {
    constructor(public readonly text: string, context: Context) {
        super(context);
    }

    static parse(input: string, context: Context): IResult<[TextNode, Context]> {
        const parseResult = stringLiteral(input);
        if (isErr(parseResult)) {
            return Err(new ParseError(
                `текст (${unwrapErr(parseResult)})`,
                input,
                new CustomError("Розбір текстового вузла"),
            ));
        }
        const [rest, n] = unwrap(parseResult);
        return Ok([rest, [new TextNode(n, context), context.addColumns(input.length - rest.length)]]);
    }

    toString(): string {
        return `TextNode("${this.text}")`;
    }
}

const BACKSLASH_TAG = tag("\\");

const MAP_ESCAPE_CHAR = new Map<string, string>([
    ["\"", "\""],
    ["t", "\t"],
    ["\\", "\\"],
]);

const escapedLineFeed = preceded(BACKSLASH_TAG, tag("n"));
const escapedCarriageReturn = preceded(BACKSLASH_TAG, tag("r"));
const allowedChars = noneOf("\"\\n\\r\\\\");
const escapedChar = preceded(BACKSLASH_TAG, oneOf("\"t\\\\"));
const stringWithoutQuotes = many0(alt(
    value(escapedLineFeed, "\n"),
    value(escapedCarriageReturn, "\r"),
    map(escapedChar, char =>
        MAP_ESCAPE_CHAR.get(char),
    ),
    allowedChars,
));

const DOUBLE_QUOTE = tag("\"");

const stringLiteral = map(
    delimited(
        i => withError(
            DOUBLE_QUOTE,
            new ParseError('"', i, new CustomError("Розбір початку текстового вузла")),
        )(i),
        stringWithoutQuotes,
        i => withError(
            DOUBLE_QUOTE,
            new ParseError('"', i, new CustomError("Розбір кінця текстового вузла")),
        )(i),
    ),
    (chars) => chars.join(""),
);
