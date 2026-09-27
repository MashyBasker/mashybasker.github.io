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

