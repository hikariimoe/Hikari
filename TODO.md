# TODO List
These are all of the potential ideas, and features that are meant to be added to Hikari. This list is not exhaustive and is subject to change at any time.
Ideally, tracking the progress of these features should be done via the issue tracker, and once labels are setup; links to the issues should be added to the list.

Once that's done, people can be assigned individually to each issue and the progress of each issue can be tracked.

## Configuration & Architecture
- [x] supporting /aicg/ proxies that have keys to them (such as my own)
- [ ] (unlikely) support using multiple proxies at once to circumvent ratelimits (this feels unethical ngl)
- [ ] find a way to optimize prompts (potentially see https://github.com/microsoft/guidance & rewriting it into TS)
      (https://github.com/microsoft/DeepSpeed is also an interesting candidate but its largely for training) 

## Instructions
- [/] make instructions configurable (so that they can be enabled or disabled on the fly)
- [ ] searching google images (how has this not been added yet)
- [ ] properly viewing and visiting websites (currently implemented improperly) (should use sth like cheerio to purge any and all script tags)
- [ ] generate images via a stable diffusion model
- [ ] potentially have the ability to read anime/manga lists
- [ ] teach her how to embrace the power of the dark side (aka how to be a proper shitposter)
- [ ] add the ability to search for music and potentially play it (hoooooooooooooooooooooooooooooooooooooooooooooooooooooooooo)
- [/] support discord actions
    - [x?] add the ability for her to delete messages (got moved but dunno if it works)
    - [ ] add the ability to ban/kick users (imagine how fucking hilarious this could be)
    - [ ] add the ability to pin messages and read pinned messages
    - [ ] add the ability to add basic reactions to a message
    - [x] add the ability to change her status

## AI Modeling/Prompting
- [ ] make a harsh and strictER PROMPT to force gpt-3.5 to act a certain way
- [ ] harshly cleanup Context.ts & document it
- [/] harshly cleanup Agent.ts & document it (it went from being really simple to being *not* very simple lmao)
- [ ] getting the last few messages in the channel for remembering and preserving previous contexts
- [\] move memory away from postgres and attach it to context (super unfortunate we removed it from the prompts for now)
- [ ] add proper safety measures for sfw environments
- [ ] add certain prompts and cues depending on the channel environment (such as whether a channel is nsfw or not)
      other cues include but are not limited to:
      * dm channels
      * channels in very small servers (should these be considered private?)
      * nsfw channels

## Suggestions:
- [ ] store certain events/actions over pgsql, maybe? (namely the generated events) (gotta have a use for pgsql)
- [ ] let hikari have a twitter account (someone suggested this and i am both all for it but also terrified)

## Dreams
- [ ] commission an artist to make hikari a real anime girl instead of just randomly stealing images off the internet

### LEGEND:
- [ ] | not completed
- [/] | in progress
- [\] | shelved / abandoned / put on hold
- [x] | completed