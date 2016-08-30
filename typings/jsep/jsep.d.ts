declare module "jsep" {

    interface Expression {
        type: ExpressionType
    }

    type ExpressionType = 'Compound' | 'Identifier' | 'MemberExpression' | 'Literal' | 'ThisExpression' | 'CallExpression' | 'UnaryExpression' | 'BinaryExpression' | 'LogicalExpression' | 'ConditionalExpression' | 'ArrayExpression';

    function parse(val: string): Expression;

    namespace parse {
        function addUnaryOp(operatorName: string): void;
        function addBinaryOp(operatorName: string, precedence: number): void;
        function removeUnaryOp(operatorName: string): void;
        function removeBinaryOp(operatorName: string): void;
    }

    export = parse;
}