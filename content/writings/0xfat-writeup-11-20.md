---
title: "0xfat CTF writeup Levels 11-20"
date: "2026-09-27"
description: "This post is a writeup for the CTF challenge website 0xfat for the levels 11 through 20"
---

## Introduction

I've recently restarted solving CTF challenges as a way to get into exploit development and security research. I found this website [0xfat.io](https://0xf.at/) to solve some basic to and slightly difficult challenges. For some of the problems I needed help, and searched for writeups. I found this [blog](https://n0x.io/posts/0xfat_1/), however it had solutions only for levels 1 to 10.

I will be adding the solutions from level 11 onwards in this post. Currently I have added till level 20.

### Level 11

The password is given by the output of the following PHP code

```PHP
function pwCheck($password)
{
    if($password==date("d.m.Y")) //GMT +1
        return true;
    else return false;
}
```

This is very simple and the password is what the current date is, separated by dots in the format `<day>.<month>.<year>`

### Level 12

The problem states that the flag is the sum of the numbers from 1 to 435. This can be simply computed by using the formula

$$\sum_{i=1}^{n} = \frac{n \times (n+1)}{2}$$

This will give us the sum.

### Level 13

Again we are given a piece of PHP code.

```PHP
function pwCheck($username,$password)
{
    if(!$username || !$password) return false;
    if(strlen($username)==$password)
        return true;
    else return false;
}
```

We just need to provide a username and use the length of the username as password.

### Level 14

This time we are given another code.

```PHP
function pwCheck($guid,$password)
{
  if(!$guid || !$password) return false;
  $users = implode(file('/data/login_info.json'));
  $json = json_decode($users,true);

  foreach($json['result'] as $data)
    if($data['guid']==$guid && $data['password'] == $password && $data['account_status']=='active')
      return true;
  return false;
}
```
We see that it reads a JSON file and decodes it. There is some `if` condition that needs to be met to be accepted. Let's look at the JSON file first, by going to the path `/data/login_info.json` at the root of the website i.e `0xf.at/data/login_info.json`. Only one of the JSON entries have the `account_status` as `active`. We need to use the username and password from this specific entry.

### Level 15

After putting in some inputs and checking their outputs, we notice a very straightforward pattern. Let's say an input string is made of the letters c1, c2, c3... and so on. The algorithm works like this

```
c1 c2 c3 c4
|  |  |  |
+--|--|--|-> c1
   +--|--|-> c2' (c2 + 1) // adding to the ASCII value of the character
      +--|-> c3' (c3 + 2)
         +-> c4' (c4 + 3)
```

A python script to give us the input when an output is provided.

```python
#/usr/bin/python3

a = input("> ")
s = a[0]
for i, x in enumerate(a[1:]):
    s += chr(ord(x) - (i+1))
print(s)
```

### Level 16

The PHP code uses Base64 encoding on the password and checks equality with a string. So, to get the password we can perform a decode on the string it is compared with.

```shell
echo 'YWQwZTdmNTI2NzA2N2UwOGQxYjM5ZTY3Mw==' | base64 -d
```

### Level 17

We need to find a string that matches the given regex. There can be multiple answers. Refer [Regex101](https://regex101.com/) for help with regex.

### Level 18

This is a simple morse code decode. Use a simple website like [this](https://www.devoven.com/encoding/morse-decode).

### Level 19

This problem needs us to write a small program to get the output before the time runs out.

```python
s = {
    "2": "abc",
    "3": "def",
    "4": "ghi",
    "5": "jkl",
    "6": "mno",
    "7": "pqrs",
    "8": "tuv",
    "9": "wxyz",
}

vs = s.values()
o = 0

a = input("> ")
for x in a:
    if x.isalpha():
        # look for it in the dict values
        v = [d for d in vs if x in d][0]
        # get its key
        k = next((k for k, va in s.items() if va == v), None)
        # get the index
        idx = v.index(x) + 2
        print(f"x = {x}, k = {k}, idx = {idx}")
        #print(type(idx))
        o += idx * int(k)
    else:
        o += int(x)
print(o)
```

### Level 20

We can do a brute force checking all possible combinations from the file and get the concatenated string.

```python
from hashlib import md5

a = open("wordlist.txt").read().split("\n")
for x in a:
    for b in a:
        if x != b:
            conc = x + b
            print(f" checking {conc}")
            if md5(conc.encode("utf-8")).hexdigest() == "9cb70a10d800fe17094b27ebfdc9d3b6":
                print(f"found {conc}")
                break
```
