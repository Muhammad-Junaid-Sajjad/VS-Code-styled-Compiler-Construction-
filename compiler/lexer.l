%{
    #include "y.tab.h"
    #include <string.h>
    int countn=0;

    /* Token stream recorder — every lexeme, classified (classic teaching form). */
    struct Token { char text[100]; char cls[20]; int line; };
    struct Token token_list[1000];
    int token_count = 0;

    void rec(char *text, char *cls) {
        if(token_count < 1000) {
            strncpy(token_list[token_count].text, text, 99);
            strncpy(token_list[token_count].cls, cls, 19);
            token_list[token_count].line = countn + 1;
            token_count++;
        }
    }
%}
%option yylineno

alpha [a-zA-Z]
digit [0-9]
unary "++"|"--"

%%

"printf"                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return PRINTFF; }
"scanf"                     { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return SCANFF; }
"int"                       { rec(yytext,"DATATYPE"); strcpy(yylval.nd_obj.name,(yytext)); return INT; }
"float"                     { rec(yytext,"DATATYPE"); strcpy(yylval.nd_obj.name,(yytext)); return FLOAT; }
"char"                      { rec(yytext,"DATATYPE"); strcpy(yylval.nd_obj.name,(yytext)); return CHAR; }
"void"                      { rec(yytext,"DATATYPE"); strcpy(yylval.nd_obj.name,(yytext)); return VOID; }
"return"                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return RETURN; }
"for"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return FOR; }
"if"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return IF; }
"else"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return ELSE; }
"while"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return WHILE; }
"do"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return DO; }
"break"	                    { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return BREAK; }
"continue"	                { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return CONTINUE; }
"double"                    { fprintf(stderr, "Line %d: error: unsupported type \"double\" (use int, float, or char)\n", countn+1); yyerror("unsupported type: double"); return 0; }
^"#include"[ ]*<.+\.h>      { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return INCLUDE; }
"true"                      { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return TRUE; }
"false"                     { rec(yytext,"KEYWORD"); strcpy(yylval.nd_obj.name,(yytext)); return FALSE; }
{digit}+                    { rec(yytext,"NUMBER"); strcpy(yylval.nd_obj.name,(yytext)); return NUMBER; }
{digit}+\.{digit}{1,6}      { rec(yytext,"NUMBER"); strcpy(yylval.nd_obj.name,(yytext)); return FLOAT_NUM; }
{alpha}({alpha}|{digit})*   { rec(yytext,"IDENTIFIER"); strcpy(yylval.nd_obj.name,(yytext)); return ID; }
{unary}                     { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return UNARY; }
"<="                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return LE; }
">="                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return GE; }
"=="                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return EQ; }
"!="                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return NE; }
">"	                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return GT; }
"<"	                        { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return LT; }
"&&"	                    { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return AND; }
"||"	                    { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return OR; }
"!"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return NOT; }
"+"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return ADD; }
"-"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return SUBTRACT; }
"/"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return DIVIDE; }
"*"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return MULTIPLY; }
"%"                         { rec(yytext,"OPERATOR"); strcpy(yylval.nd_obj.name,(yytext)); return MODULO; }
"="                         { rec(yytext,"OPERATOR"); return '='; }
[();{},.]                   { rec(yytext,"DELIMITER"); return *yytext; }
\/\/.*                      { ; }
\/\*(.*\n)*.*\*\/           { int _n; for(_n=0; yytext[_n]; _n++) if(yytext[_n]=='\n') countn++; }
[ \t]*                      { ; }
[\n]                        { countn++; }
["].*["]                    { rec(yytext,"STRING"); strcpy(yylval.nd_obj.name,(yytext)); return STR; }
['].[']                     { rec(yytext,"STRING"); strcpy(yylval.nd_obj.name,(yytext)); return CHARACTER; }
.	                        { rec(yytext,"DELIMITER"); return *yytext; }

%%

int yywrap() {
    return 1;
}
