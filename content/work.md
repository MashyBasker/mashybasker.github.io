---
title: "Work"
unsafe: true
---

A record of my professional work, with some personal comments. This page doesn’t include my side projects or FOSS contributions — those can be found on my GitHub and other sections of this site.

# RISC-V International

**Intern (LFX mentorship)** <br><span style="color: #999999; font-style: italic;">June 2024 -- September 2024 </span>

*Tools: OCaml, Sail, RISC-V*

The organization overseeing the development of the RISC-V instruction set architecture. I joined as a mentee under [Paul Clarke](https://riscvsummit2023.sched.com/speaker/paul_clarke.25xi5ms5) for the **Sailing Downstream II** project. It is an ongoing effort to transform the key contents within the RISC-V Sail specification into a more accessible format, such as JSON. Learn more about Sail [here](https://github.com/rems-project/sail).

I worked on the JSON backend of the Sail language, enhancing the parsing of instruction formats by implementing a union mapping for each construct. Additionally, I was involved in improving the CI pipeline enabling seamless building and testing across multiple architectures and operating systems.

This deepended my experience in parsing technologies, as well as  OCaml. I provided some feedback and opinion on the codebase due to my past experience.


# Inria

**Research Intern** <br><span style="color: #999999; font-style: italic;">December 2023 -- May 2024 </span>

*Tools: OCaml, ocamllex, Menhir*

A French national research institution focusing on computer science and applied mathematics. I worked with [Dr. Julia Lawall](https://en.wikipedia.org/wiki/Julia_Lawall) on [Coccinelle](https://coccinelle.gitlabpages.inria.fr/website/) -- a tool that provides the Semantic Patch Language (SmPL) for pattern matching and making transformations to C code.

I worked on extending Coccinelle to support C++ codebases by adding parsing support. This involved modifying both the source code parser and the SmPL parser to handle C++ constructs. I used ocamllex to perform lexical analysis of the C++ constructs and Menhir to generate parser code. Additionally, I ensured compatibility between the source code parser and the SmPL parser.

This internship introduced me to compiler technology as well as functional programming, which I've come to appreciate and admire.

